import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import prisma from '@/lib/prisma'
import { computeLeaderboardScore } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Leaderboard - DevPulse',
  description: 'Top contributors on DevPulse ranked by reputation, reviews, submissions, and votes',
}

// Required by spec: getCachedLeaderboard using unstable_cache with tag "leaderboard"
const getCachedLeaderboard = unstable_cache(
  async () => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          reputation: true,
          _count: {
            select: {
              reviews: true,
              submissions: true,
            },
          },
        },
      })

      // Get net votes received for each user's submissions
      const voteData = await prisma.$queryRaw<
        { authorId: string; upvotes: bigint; downvotes: bigint }[]
      >`
        SELECT s."authorId", 
          COALESCE(COUNT(CASE WHEN v."voteType" = 'UPVOTE' THEN 1 END), 0) as upvotes,
          COALESCE(COUNT(CASE WHEN v."voteType" = 'DOWNVOTE' THEN 1 END), 0) as downvotes
        FROM "User" u
        LEFT JOIN "Submission" s ON s."authorId" = u.id
        LEFT JOIN "Vote" v ON v."submissionId" = s.id
        GROUP BY s."authorId"
      `

      const voteMap = new Map(
        voteData.filter(row => row.authorId !== null).map((row) => [
          row.authorId,
          Number(row.upvotes) - Number(row.downvotes),
        ]),
      )

      const entries = users
        .map((user) => {
          const netVotesReceived = voteMap.get(user.id) ?? 0
          const metrics = {
            reputation: user.reputation,
            totalReviewsGiven: user._count.reviews,
            totalSubmissions: user._count.submissions,
            netVotesReceived,
          }
          const score = computeLeaderboardScore(metrics)

          return {
            user: {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              reputation: user.reputation,
            },
            score,
            breakdown: {
              reputationPoints: user.reputation * 1.0,
              reviewBonus: user._count.reviews * 15,
              submissionBonus: user._count.submissions * 10,
              voteBonus: netVotesReceived * 2,
            },
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map((entry, index) => ({ rank: index + 1, ...entry }))

      return entries
    } catch {
      return []
    }
  },
  ['leaderboard'],
  { revalidate: 300, tags: ['leaderboard'] },
)

export default async function LeaderboardPage() {
  const entries = await getCachedLeaderboard()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400">Top contributors ranked by reputation, reviews, and quality</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-800/50 text-xs font-medium text-gray-400 uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Developer</div>
          <div className="col-span-2 text-right">Score</div>
          <div className="col-span-2 text-right">Reviews</div>
          <div className="col-span-2 text-right">Submissions</div>
          <div className="col-span-1 text-right">Rep</div>
        </div>

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No entries yet. Be the first!
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.user.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-800 hover:bg-gray-800/30 transition-colors items-center"
            >
              {/* Rank */}
              <div className="col-span-1">
                {entry.rank <= 3 ? (
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      entry.rank === 1
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : entry.rank === 2
                          ? 'bg-gray-400/20 text-gray-300'
                          : 'bg-orange-500/20 text-orange-400'
                    }`}
                  >
                    {entry.rank}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">{entry.rank}</span>
                )}
              </div>

              {/* User */}
              <div className="col-span-4 flex items-center gap-3">
                {entry.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.user.avatarUrl}
                    alt={entry.user.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                    {entry.user.displayName[0]}
                  </div>
                )}
                <div>
                  <a
                    href={`/profile/${entry.user.username}`}
                    className="text-white font-medium hover:text-indigo-400 transition-colors text-sm"
                  >
                    {entry.user.displayName}
                  </a>
                  <p className="text-gray-500 text-xs">@{entry.user.username}</p>
                </div>
              </div>

              {/* Score */}
              <div className="col-span-2 text-right">
                <span className="text-indigo-400 font-semibold">{entry.score.toFixed(2)}</span>
              </div>

              {/* Review bonus */}
              <div className="col-span-2 text-right text-gray-400 text-sm">
                +{entry.breakdown.reviewBonus}
              </div>

              {/* Submission bonus */}
              <div className="col-span-2 text-right text-gray-400 text-sm">
                +{entry.breakdown.submissionBonus}
              </div>

              {/* Reputation */}
              <div className="col-span-1 text-right text-gray-300 text-sm">
                {entry.user.reputation}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
