import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { apiSuccess, apiError, computeLeaderboardScore } from '@/lib/utils'
import { unstable_cache } from 'next/cache'

// ============================================================
// GET /api/leaderboard
// ============================================================
export async function GET() {
  try {
    const data = await getCachedLeaderboardData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/leaderboard error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}

const getCachedLeaderboardData = unstable_cache(
  async () => {
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
        votes: {
          select: {
            voteType: true,
            submission: {
              select: { authorId: true },
            },
          },
        },
      },
    })

    // Compute votes received per user
    // Votes are computed via raw SQL above

    // Better approach: get net votes for each user's submissions
    const userVoteData = await prisma.$queryRaw<
      { authorId: string; upvotes: bigint; downvotes: bigint }[]
    >`
      SELECT s."authorId", 
        COUNT(CASE WHEN v."voteType" = 'UPVOTE' THEN 1 END) as upvotes,
        COUNT(CASE WHEN v."voteType" = 'DOWNVOTE' THEN 1 END) as downvotes
      FROM submissions s
      LEFT JOIN votes v ON v."submissionId" = s.id
      GROUP BY s."authorId"
    `

    const voteMap = new Map(
      userVoteData.map((row) => [
        row.authorId,
        {
          upvotes: Number(row.upvotes),
          downvotes: Number(row.downvotes),
          net: Number(row.upvotes) - Number(row.downvotes),
        },
      ]),
    )

    const entries = users
      .map((user) => {
        const voteInfo = voteMap.get(user.id) ?? { upvotes: 0, downvotes: 0, net: 0 }

        const leaderboardUser = {
          reputation: user.reputation,
          totalReviewsGiven: user._count.reviews,
          totalSubmissions: user._count.submissions,
          netVotesReceived: voteInfo.net,
        }

        const score = computeLeaderboardScore(leaderboardUser)

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
            voteBonus: voteInfo.net * 2,
          },
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }))

    const generatedAt = new Date()
    const cachedUntil = new Date(generatedAt.getTime() + 5 * 60 * 1000)

    return apiSuccess(
      { entries },
      {
        generatedAt: generatedAt.toISOString(),
        cachedUntil: cachedUntil.toISOString(),
      },
    )
  },
  ['leaderboard-api'],
  { revalidate: 300, tags: ['leaderboard'] },
)
