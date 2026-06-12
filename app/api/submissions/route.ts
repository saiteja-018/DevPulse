import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import redis from '@/lib/redis'
import { createSubmissionSchema } from '@/lib/validations'
import { hashObject, apiSuccess, apiError } from '@/lib/utils'
import { REDIS_TTL, REPUTATION_POINTS } from '@/lib/constants'
import { Prisma, SubmissionStatus, DifficultyTag, VoteType } from '@prisma/client'

// ============================================================
// GET /api/submissions
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10')))
    const status = searchParams.get('status') as SubmissionStatus | null
    const language = searchParams.get('language')
    const difficulty = searchParams.get('difficulty') as DifficultyTag | null
    const sort = searchParams.get('sort') ?? 'newest'
    const tag = searchParams.get('tag')

    const queryParams = {
      page: page.toString(),
      limit: limit.toString(),
      status: status ?? '',
      language: language ?? '',
      difficulty: difficulty ?? '',
      sort,
      tag: tag ?? '',
    }

    // Check Redis cache
    const cacheHash = await hashObject(queryParams as Record<string, unknown>)
    const cacheKey = `cache:submissions:${cacheHash}`

    const currentUser = await getUserFromSession()

    // Only serve cache for unauthenticated requests (to avoid userVote mismatch)
    if (!currentUser) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    // Build where clause
    const where: Prisma.SubmissionWhereInput = {}
    if (status && Object.values(SubmissionStatus).includes(status)) where.status = status
    if (language) where.language = language
    if (difficulty && Object.values(DifficultyTag).includes(difficulty)) where.difficultyTag = difficulty
    if (tag) {
      where.tags = {
        some: {
          tag: { name: tag },
        },
      }
    }

    // Build orderBy
    let orderBy: Prisma.SubmissionOrderByWithRelationInput | Prisma.SubmissionOrderByWithRelationInput[] = {}
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'most_voted':
        orderBy = { votes: { _count: 'desc' } }
        break
      case 'most_reviewed':
        orderBy = { reviews: { _count: 'desc' } }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    const skip = (page - 1) * limit

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
          _count: {
            select: { reviews: true, votes: true },
          },
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          votes: currentUser
            ? {
                where: { userId: currentUser.id },
                select: { voteType: true },
              }
            : false,
        },
      }),
      prisma.submission.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    const formattedSubmissions = submissions.map((sub) => ({
      id: sub.id,
      title: sub.title,
      description: sub.description,
      language: sub.language,
      status: sub.status,
      difficultyTag: sub.difficultyTag,
      viewCount: sub.viewCount,
      createdAt: sub.createdAt.toISOString(),
      author: sub.author,
      _count: sub._count,
      tags: sub.tags.map((st) => st.tag),
      userVote: currentUser && sub.votes && sub.votes.length > 0
        ? (sub.votes as { voteType: VoteType }[])[0].voteType
        : null,
    }))

    const response = apiSuccess(
      { submissions: formattedSubmissions },
      {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    )

    // Cache for unauthenticated requests
    if (!currentUser) {
      await redis.set(cacheKey, response, { ex: REDIS_TTL.SUBMISSIONS_CACHE })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/submissions error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}

// ============================================================
// POST /api/submissions
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) {
      return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const validation = createSubmissionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        apiError(validation.error.issues[0].message, 'VALIDATION_ERROR'),
        { status: 400 },
      )
    }

    const { title, description, codeContent, language, difficultyTag, tagIds } = validation.data

    // Verify all tagIds exist
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    })

    if (tags.length !== tagIds.length) {
      return NextResponse.json(apiError('One or more tag IDs are invalid', 'INVALID_TAGS'), { status: 400 })
    }

    // Create submission and update reputation in a transaction
    const submission = await prisma.$transaction(async (tx) => {
      const newSubmission = await tx.submission.create({
        data: {
          title,
          description,
          codeContent,
          language,
          difficultyTag: difficultyTag as DifficultyTag,
          authorId: currentUser.id,
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        },
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
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          _count: {
            select: { reviews: true, votes: true },
          },
        },
      })

      // Increment author reputation by 5
      await tx.user.update({
        where: { id: currentUser.id },
        data: { reputation: { increment: REPUTATION_POINTS.SUBMISSION_CREATED } },
      })

      return newSubmission
    })

    // Invalidate all submission list caches
    const keys = await redis.keys('cache:submissions:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    const formatted = {
      ...submission,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      tags: submission.tags.map((st) => st.tag),
      userVote: null,
    }

    return NextResponse.json(apiSuccess(formatted), { status: 201 })
  } catch (error) {
    console.error('POST /api/submissions error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}
