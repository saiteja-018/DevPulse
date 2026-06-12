import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import redis from '@/lib/redis'
import { createReviewSchema } from '@/lib/validations'
import { apiSuccess, apiError } from '@/lib/utils'
import { REPUTATION_POINTS } from '@/lib/constants'
import { NotificationType, SubmissionStatus } from '@prisma/client'
import Pusher from 'pusher'
import { revalidatePath } from 'next/cache'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? 'us2',
  useTLS: true,
})

// ============================================================
// POST /api/reviews
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) {
      return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const validation = createReviewSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        apiError(validation.error.issues[0].message, 'VALIDATION_ERROR'),
        { status: 400 },
      )
    }

    const { submissionId, content, lineReference, rating } = validation.data

    // Fetch submission to check author and status
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { authorId: true, status: true },
    })

    if (!submission) {
      return NextResponse.json(apiError('Submission not found', 'NOT_FOUND'), { status: 404 })
    }

    // Prevent self-review
    if (submission.authorId === currentUser.id) {
      return NextResponse.json(
        apiError('You cannot review your own submission', 'self_review_not_allowed'),
        { status: 403 },
      )
    }

    // Check for duplicate review
    const existingReview = await prisma.review.findFirst({
      where: { submissionId, reviewerId: currentUser.id },
    })

    if (existingReview) {
      return NextResponse.json(
        apiError('You have already reviewed this submission', 'review_already_exists'),
        { status: 409 },
      )
    }

    // ---- createReviewTransaction ----
    const review = await createReviewTransaction(
      submissionId,
      currentUser.id,
      submission.authorId,
      content,
      lineReference ?? null,
      rating,
      submission.status,
    )

    // Revalidate the submission detail page
    revalidatePath(`/review/${submissionId}`)

    // Invalidate notification cache for submission author
    await redis.del(`notif:unread:${submission.authorId}`)

    // Emit real-time event via Pusher
    await pusher.trigger(`private-user-${submission.authorId}`, 'new-notification', {
      type: 'NEW_REVIEW',
      submissionId,
      reviewerUsername: currentUser.username,
    })

    await pusher.trigger(`submission-${submissionId}`, 'new-review', {
      review: {
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
        reviewer: {
          id: currentUser.id,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatarUrl: null,
          reputation: currentUser.reputation,
        },
      },
    })

    return NextResponse.json(
      apiSuccess({
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      }),
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}

/**
 * Prisma transaction for creating a review with all required side effects.
 * Named createReviewTransaction as required by the spec.
 */
async function createReviewTransaction(
  submissionId: string,
  reviewerId: string,
  authorId: string,
  content: string,
  lineReference: number | null,
  rating: number,
  currentStatus: SubmissionStatus,
) {
  return prisma.$transaction(async (tx) => {
    // 1. Insert the review
    const review = await tx.review.create({
      data: {
        submissionId,
        reviewerId,
        content,
        lineReference,
        rating,
      },
    })

    // 2. Update submission status to UNDER_REVIEW if it was PENDING
    if (currentStatus === 'PENDING') {
      await tx.submission.update({
        where: { id: submissionId },
        data: { status: 'UNDER_REVIEW' },
      })
    }

    // 3. Increment reviewer's reputation by 10
    await tx.user.update({
      where: { id: reviewerId },
      data: { reputation: { increment: REPUTATION_POINTS.REVIEW_GIVEN } },
    })

    // 4. Create a NEW_REVIEW notification for the submission author
    await tx.notification.create({
      data: {
        userId: authorId,
        type: NotificationType.NEW_REVIEW,
        message: `Your submission received a new review with rating ${rating}/5`,
        metadata: { submissionId, reviewId: review.id },
      },
    })

    return review
  })
}

// ============================================================
// PATCH /api/reviews (mark as resolved)
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) {
      return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const { reviewId, isResolved } = body

    if (!reviewId || typeof isResolved !== 'boolean') {
      return NextResponse.json(
        apiError('reviewId and isResolved are required', 'VALIDATION_ERROR'),
        { status: 400 },
      )
    }

    // Fetch review with submission author info
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        submission: {
          select: { authorId: true, id: true },
        },
      },
    })

    if (!review) {
      return NextResponse.json(apiError('Review not found', 'NOT_FOUND'), { status: 404 })
    }

    // Only the submission's author can resolve the review
    if (review.submission.authorId !== currentUser.id) {
      return NextResponse.json(
        apiError('Only the submission author can resolve reviews', 'FORBIDDEN'),
        { status: 403 },
      )
    }

    const updatedReview = await prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { isResolved },
      })

      // Create REVIEW_RESOLVED notification for the reviewer
      if (isResolved) {
        await tx.notification.create({
          data: {
            userId: review.reviewerId,
            type: NotificationType.REVIEW_RESOLVED,
            message: 'Your review has been marked as resolved',
            metadata: { reviewId, submissionId: review.submission.id },
          },
        })

        // Invalidate reviewer's notification cache
        await redis.del(`notif:unread:${review.reviewerId}`)

        // Emit real-time notification
        await pusher.trigger(`private-user-${review.reviewerId}`, 'new-notification', {
          type: 'REVIEW_RESOLVED',
          reviewId,
        })
      }

      return updated
    })

    return NextResponse.json(
      apiSuccess({
        ...updatedReview,
        createdAt: updatedReview.createdAt.toISOString(),
        updatedAt: updatedReview.updatedAt.toISOString(),
      }),
    )
  } catch (error) {
    console.error('PATCH /api/reviews error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}
