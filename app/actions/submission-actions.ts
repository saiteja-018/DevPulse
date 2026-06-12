'use server'

import prisma from '@/lib/prisma'
import redis from '@/lib/redis'
import { REDIS_TTL } from '@/lib/constants'
import { Prisma } from '@prisma/client'

const VIEW_SYNC_INTERVAL = 5 * 60 // 5 minutes in seconds
const VIEW_SYNC_COUNT_THRESHOLD = 10

export type FullSubmission = Prisma.SubmissionGetPayload<{
  include: {
    author: {
      select: {
        id: true
        username: true
        displayName: true
        avatarUrl: true
        reputation: true
      }
    }
    reviews: {
      include: {
        reviewer: {
          select: {
            id: true
            username: true
            displayName: true
            avatarUrl: true
            reputation: true
          }
        }
      }
    }
    votes: true
    tags: {
      include: {
        tag: { select: { id: true; name: true; color: true } }
      }
    }
    snapshots: true
    _count: {
      select: { reviews: true; votes: true }
    }
  }
}>

/**
 * Atomically increments the view count for a submission using Redis.
 * Syncs to DB every 10 views or every 5 minutes.
 */
export async function incrementViewCount(submissionId: string): Promise<{ newCount: number }> {
  const viewKey = `viewcount:${submissionId}`
  const timestampKey = `viewcount_ts:${submissionId}`

  const newCount = await redis.incr(viewKey)
  const now = Math.floor(Date.now() / 1000)
  const lastSync = await redis.get<number>(timestampKey)

  const shouldSync =
    newCount % VIEW_SYNC_COUNT_THRESHOLD === 0 ||
    !lastSync ||
    now - lastSync > VIEW_SYNC_INTERVAL

  if (shouldSync) {
    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { viewCount: { increment: newCount } },
      })
      // Reset counter after sync
      await Promise.all([
        redis.set(viewKey, 0, { ex: VIEW_SYNC_INTERVAL * 2 }),
        redis.set(timestampKey, now, { ex: VIEW_SYNC_INTERVAL * 2 }),
      ])
    } catch {
      // Submission may not exist yet, ignore
    }
  }

  return { newCount }
}

/**
 * Fetches a full submission, checking Redis cache first.
 * Cache key: cache:submission:{submissionId}, TTL: 120s
 */
export async function getSubmissionWithCache(submissionId: string): Promise<FullSubmission | null> {
  const cacheKey = `cache:submission:${submissionId}`

  // Check cache first
  const cached = await redis.get<FullSubmission>(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch from database
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
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
      reviews: {
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
      },
      votes: true,
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      snapshots: true,
      _count: {
        select: { reviews: true, votes: true },
      },
    },
  })

  if (!submission) return null

  // Store in Redis with TTL
  await redis.set(cacheKey, submission, { ex: REDIS_TTL.SUBMISSION_CACHE })

  return submission
}
