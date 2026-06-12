import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import redis from '@/lib/redis'
import { apiSuccess, apiError } from '@/lib/utils'
import { SubmissionStatus } from '@prisma/client'

const VIEW_SYNC_INTERVAL = 5 * 60 // 5 minutes in seconds
const VIEW_SYNC_COUNT_THRESHOLD = 10

// ============================================================
// GET /api/submissions/[id]
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params

    // Atomically increment view count in Redis
    const viewKey = `viewcount:${id}`
    const newCount = await redis.incr(viewKey)

    // Check if we need to sync to DB (every 10 views)
    const timestampKey = `viewcount_ts:${id}`
    const lastSync = await redis.get<number>(timestampKey)
    const now = Math.floor(Date.now() / 1000)

    const shouldSync =
      newCount % VIEW_SYNC_COUNT_THRESHOLD === 0 ||
      !lastSync ||
      now - lastSync > VIEW_SYNC_INTERVAL

    if (shouldSync) {
      await Promise.all([
        prisma.submission.update({
          where: { id },
          data: { viewCount: { increment: newCount % VIEW_SYNC_COUNT_THRESHOLD === 0 ? VIEW_SYNC_COUNT_THRESHOLD : newCount } },
        }).catch(() => {}),
        redis.set(timestampKey, now, { ex: VIEW_SYNC_INTERVAL * 2 }),
      ])
    }

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

    if (!submission) {
      return NextResponse.json(apiError('Submission not found', 'NOT_FOUND'), { status: 404 })
    }

    const formatted = {
      ...submission,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      tags: submission.tags.map((st) => st.tag),
      reviews: submission.reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      snapshots: submission.snapshots.map((s) => ({
        ...s,
        uploadedAt: s.uploadedAt.toISOString(),
      })),
    }

    return NextResponse.json(apiSuccess(formatted))
  } catch (error) {
    console.error('GET /api/submissions/[id] error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}

// ============================================================
// PATCH /api/submissions/[id]
// ============================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    const currentUser = await getUserFromSession()

    if (!currentUser) {
      return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { authorId: true },
    })

    if (!submission) {
      return NextResponse.json(apiError('Submission not found', 'NOT_FOUND'), { status: 404 })
    }

    if (submission.authorId !== currentUser.id) {
      return NextResponse.json(apiError('Forbidden: not the author', 'FORBIDDEN'), { status: 403 })
    }

    const body = await request.json()

    // Only allow specific fields to be updated
    const allowedFields = ['title', 'description', 'codeContent', 'status']
    const requestedFields = Object.keys(body)
    const disallowedFields = requestedFields.filter((f) => !allowedFields.includes(f))

    if (disallowedFields.length > 0) {
      return NextResponse.json(
        apiError(`Cannot update fields: ${disallowedFields.join(', ')}`, 'INVALID_FIELDS'),
        { status: 400 },
      )
    }

    // Validate status if provided
    if (body.status && !Object.values(SubmissionStatus).includes(body.status)) {
      return NextResponse.json(apiError('Invalid status value', 'INVALID_STATUS'), { status: 400 })
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
        ...(body.codeContent && { codeContent: body.codeContent }),
        ...(body.status && { status: body.status }),
      },
    })

    // Invalidate cache
    await redis.del(`cache:submission:${id}`)

    return NextResponse.json(
      apiSuccess({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      }),
    )
  } catch (error) {
    console.error('PATCH /api/submissions/[id] error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}

// ============================================================
// DELETE /api/submissions/[id]
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    const currentUser = await getUserFromSession()

    if (!currentUser) {
      return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { authorId: true },
    })

    if (!submission) {
      return NextResponse.json(apiError('Submission not found', 'NOT_FOUND'), { status: 404 })
    }

    if (submission.authorId !== currentUser.id) {
      return NextResponse.json(apiError('Forbidden: not the author', 'FORBIDDEN'), { status: 403 })
    }

    // Cascade delete via Prisma (relations have onDelete: Cascade)
    await prisma.submission.delete({ where: { id } })

    // Invalidate caches
    await redis.del(`cache:submission:${id}`)
    const listKeys = await redis.keys('cache:submissions:*')
    if (listKeys.length > 0) {
      await redis.del(...listKeys)
    }

    return NextResponse.json(apiSuccess({ deleted: true }))
  } catch (error) {
    console.error('DELETE /api/submissions/[id] error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}
