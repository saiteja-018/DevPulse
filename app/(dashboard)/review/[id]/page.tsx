import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { incrementViewCount } from '@/app/actions/submission-actions'
import { SubmissionDetail } from '@/components/submission/SubmissionDetail'
import { ReviewsList } from '@/components/review/ReviewsList'
import { ReviewsSkeleton } from '@/components/review/ReviewsSkeleton'

// Required by spec: pre-render 20 most recent submissions at build time
export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const submissions = await prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true },
    })

    return submissions.map((sub) => ({ id: sub.id }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      select: { title: true, description: true },
    })

    if (!submission) return { title: 'Submission Not Found' }

    return {
      title: submission.title,
      description: submission.description.substring(0, 160),
    }
  } catch {
    return { title: 'Submission' }
  }
}

async function ReviewsSection({ submissionId }: { submissionId: string }) {
  const reviews = await prisma.review.findMany({
    where: { submissionId },
    include: {
      reviewer: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          reputation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const formatted = reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return <ReviewsList initialReviews={formatted} submissionId={submissionId} />
}

export default async function ReviewPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  // Increment view count
  await incrementViewCount(id)

  const currentUser = await getUserFromSession()

  // Fetch submission
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          reputation: true,
        },
      },
      votes: currentUser ? { where: { userId: currentUser.id } } : false,
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      snapshots: true,
      _count: { select: { reviews: true, votes: true } },
    },
  })

  if (!submission) notFound()

  const formattedSubmission = {
    ...submission,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    tags: submission.tags.map((st) => st.tag),
    snapshots: submission.snapshots.map((s) => ({
      ...s,
      uploadedAt: s.uploadedAt.toISOString(),
    })),
    userVote:
      currentUser && Array.isArray(submission.votes) && submission.votes.length > 0
        ? (submission.votes as { voteType: string }[])[0].voteType
        : null,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        <SubmissionDetail
          submission={formattedSubmission as Parameters<typeof SubmissionDetail>[0]['submission']}
          currentUserId={currentUser?.id ?? null}
        />

        {/* Reviews Section with Suspense boundary */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Reviews ({submission._count.reviews})
          </h2>
          <Suspense fallback={<ReviewsSkeleton />}>
            <ReviewsSection submissionId={id} />
          </Suspense>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Author info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Author</h3>
          <div className="flex items-center gap-3">
            {submission.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={submission.author.avatarUrl}
                alt={submission.author.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {submission.author.displayName[0]}
              </div>
            )}
            <div>
              <p className="text-white font-medium">{submission.author.displayName}</p>
              <p className="text-gray-400 text-sm">@{submission.author.username}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400">
            <span>Reputation</span>
            <span className="text-indigo-400 font-medium">{submission.author.reputation}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Views</span>
              <span className="text-white">{submission.viewCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reviews</span>
              <span className="text-white">{submission._count.reviews}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Votes</span>
              <span className="text-white">{submission._count.votes}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
