import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getContributionData } from '@/lib/utils'
import { ContributionGraph } from '@/components/profile/ContributionGraph'

export async function generateMetadata({
  params,
}: {
  params: { username: string }
}): Promise<Metadata> {
  try {
    const user = await prisma.user.findUnique({
      where: { username: params.username },
      select: { displayName: true },
    })

    if (!user) return { title: 'User Not Found' }

    return {
      title: `${user.displayName}'s Profile - DevPulse`,
      description: `View ${user.displayName}'s code submissions, reviews, and contribution history on DevPulse`,
    }
  } catch {
    return { title: 'User Profile - DevPulse' }
  }
}

export default async function ProfilePage({
  params,
}: {
  params: { username: string }
}) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    include: {
      _count: {
        select: {
          submissions: true,
          reviews: true,
          votes: true,
        },
      },
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: { select: { reviews: true, votes: true } },
          tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        },
      },
    },
  })

  if (!user) notFound()

  // Get votes received on user's submissions
  const votesReceived = await prisma.vote.count({
    where: { submission: { authorId: user.id } },
  })

  // Get contribution data (30 days)
  const contributionData = await getContributionData(user.id)

  // const isOwnProfile = currentUser?.id === user.id

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-20 h-20 rounded-2xl ring-2 ring-indigo-500/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.displayName[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{user.displayName}</h1>
            <p className="text-gray-400">@{user.username}</p>
            <p className="text-gray-500 text-sm mt-1">
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-400">{user.reputation}</div>
            <div className="text-sm text-gray-400">Reputation</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{user._count.submissions}</div>
            <div className="text-sm text-gray-400">Submissions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{user._count.reviews}</div>
            <div className="text-sm text-gray-400">Reviews Given</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{votesReceived}</div>
            <div className="text-sm text-gray-400">Votes Received</div>
          </div>
        </div>
      </div>

      {/* Contribution Graph */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Activity (Last 30 Days)</h2>
        <ContributionGraph data={contributionData} />
      </div>

      {/* Recent Submissions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Submissions</h2>
        {user.submissions.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
            No submissions yet
          </div>
        ) : (
          <div className="space-y-4">
            {user.submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a
                      href={`/review/${sub.id}`}
                      className="text-white font-medium hover:text-indigo-400 transition-colors"
                    >
                      {sub.title}
                    </a>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-800 rounded-md font-mono text-xs">
                        {sub.language}
                      </span>
                      <span>·</span>
                      <span>{sub._count.reviews} reviews</span>
                      <span>·</span>
                      <span>{sub._count.votes} votes</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                      sub.status === 'PENDING'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : sub.status === 'UNDER_REVIEW'
                          ? 'bg-blue-500/10 text-blue-400'
                          : sub.status === 'REVIEWED'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
