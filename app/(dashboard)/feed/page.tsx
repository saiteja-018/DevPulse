import type { Metadata } from 'next'
import { getUserFromSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { SubmissionFeed } from '@/components/submission/SubmissionFeed'
import { SubmissionStatus, DifficultyTag } from '@prisma/client'

type SearchParams = {
  page?: string
  limit?: string
  status?: string
  language?: string
  difficulty?: string
  sort?: string
  tag?: string
}

// Export required by spec
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<Metadata> {
  const filters = []
  if (searchParams.language) filters.push(searchParams.language)
  if (searchParams.difficulty) filters.push(searchParams.difficulty)
  if (searchParams.status) filters.push(searchParams.status)

  return {
    title: 'DevPulse - Code Review Feed',
    description:
      filters.length > 0
        ? `Browse ${filters.join(', ')} code review submissions on DevPulse`
        : 'Browse and review code submissions from developers around the world on DevPulse',
  }
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const currentUser = await getUserFromSession()

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.limit ?? '10'))
  const status = searchParams.status as SubmissionStatus | undefined
  const language = searchParams.language
  const difficulty = searchParams.difficulty as DifficultyTag | undefined
  const sort = searchParams.sort ?? 'newest'
  const tag = searchParams.tag

  // Build where clause
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (language) where.language = language
  if (difficulty) where.difficultyTag = difficulty
  if (tag) where.tags = { some: { tag: { name: tag } } }

  // Build orderBy
  type OrderBy = Record<string, unknown>
  let orderBy: OrderBy = { createdAt: 'desc' }
  if (sort === 'oldest') orderBy = { createdAt: 'asc' }
  else if (sort === 'most_voted') orderBy = { votes: { _count: 'desc' } }
  else if (sort === 'most_reviewed') orderBy = { reviews: { _count: 'desc' } }

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
        },
        _count: { select: { reviews: true, votes: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        votes: currentUser
          ? { where: { userId: currentUser.id }, select: { voteType: true } }
          : false,
      },
    }),
    prisma.submission.count({ where }),
  ])

  const formattedSubmissions = submissions.map((sub) => ({
    ...sub,
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
    tags: sub.tags.map((st) => st.tag),
    userVote:
      currentUser && sub.votes && Array.isArray(sub.votes) && sub.votes.length > 0
        ? (sub.votes as { voteType: string }[])[0].voteType
        : null,
  }))

  const activeFilters = {
    status: searchParams.status ?? '',
    language: searchParams.language ?? '',
    difficulty: searchParams.difficulty ?? '',
    sort,
    tag: searchParams.tag ?? '',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Code Review Feed</h1>
        <p className="text-gray-400">Discover and review code submissions from the community</p>
      </div>

      <SubmissionFeed
        initialSubmissions={formattedSubmissions as Parameters<typeof SubmissionFeed>[0]['initialSubmissions']}
        initialTotal={total}
        initialPage={page}
        limit={limit}
        activeFilters={activeFilters}
        currentUserId={currentUser?.id ?? null}
      />
    </div>
  )
}
