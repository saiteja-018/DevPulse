import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { apiSuccess, apiError, resolveVoteAction, clampMin } from '@/lib/utils'
import { voteSchema } from '@/lib/validations'
import { REPUTATION_POINTS } from '@/lib/constants'
import { NotificationType, VoteType } from '@prisma/client'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? 'us2',
  useTLS: true,
})

// ============================================================
// POST /api/votes
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) {
      return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const validation = voteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        apiError(validation.error.issues[0].message, 'VALIDATION_ERROR'),
        { status: 400 },
      )
    }

    const { submissionId, voteType } = validation.data

    // Fetch submission to get author and prevent self-voting
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { authorId: true },
    })

    if (!submission) {
      return NextResponse.json(apiError('Submission not found', 'NOT_FOUND'), { status: 404 })
    }

    if (submission.authorId === currentUser.id) {
      return NextResponse.json(
        apiError('You cannot vote on your own submission', 'SELF_VOTE_NOT_ALLOWED'),
        { status: 403 },
      )
    }

    // Get existing vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        submissionId_userId: {
          submissionId,
          userId: currentUser.id,
        },
      },
    })

    // Determine action using pure resolveVoteAction function
    const voteAction = resolveVoteAction(existingVote, voteType as VoteType)

    // Execute vote action and update reputation
    await prisma.$transaction(async (tx) => {
      const previousVoteType = existingVote?.voteType ?? null

      if (voteAction.action === 'create') {
        await tx.vote.create({
          data: {
            submissionId,
            userId: currentUser.id,
            voteType: voteAction.voteType,
          },
        })

        // Adjust reputation
        if (voteAction.voteType === 'UPVOTE') {
          // Net upvote: increment author rep by 2
          await tx.user.update({
            where: { id: submission.authorId },
            data: { reputation: { increment: REPUTATION_POINTS.UPVOTE_RECEIVED } },
          })
          // Create VOTE_RECEIVED notification
          await tx.notification.create({
            data: {
              userId: submission.authorId,
              type: NotificationType.VOTE_RECEIVED,
              message: `Your submission received an upvote`,
              metadata: { submissionId },
            },
          })
        } else {
          // Net downvote: decrement author rep by 1 (min 0)
          const author = await tx.user.findUnique({
            where: { id: submission.authorId },
            select: { reputation: true },
          })
          await tx.user.update({
            where: { id: submission.authorId },
            data: { reputation: clampMin((author?.reputation ?? 0) + REPUTATION_POINTS.DOWNVOTE_RECEIVED, 0) },
          })
        }
      } else if (voteAction.action === 'delete') {
        await tx.vote.delete({
          where: {
            submissionId_userId: {
              submissionId,
              userId: currentUser.id,
            },
          },
        })

        // Reverse the reputation change
        if (previousVoteType === 'UPVOTE') {
          const author = await tx.user.findUnique({
            where: { id: submission.authorId },
            select: { reputation: true },
          })
          await tx.user.update({
            where: { id: submission.authorId },
            data: { reputation: clampMin((author?.reputation ?? 0) - REPUTATION_POINTS.UPVOTE_RECEIVED, 0) },
          })
        } else if (previousVoteType === 'DOWNVOTE') {
          await tx.user.update({
            where: { id: submission.authorId },
            data: { reputation: { increment: Math.abs(REPUTATION_POINTS.DOWNVOTE_RECEIVED) } },
          })
        }
      } else if (voteAction.action === 'update') {
        await tx.vote.update({
          where: {
            submissionId_userId: {
              submissionId,
              userId: currentUser.id,
            },
          },
          data: { voteType: voteAction.voteType },
        })

        // Swap reputation
        const author = await tx.user.findUnique({
          where: { id: submission.authorId },
          select: { reputation: true },
        })
        const currentRep = author?.reputation ?? 0

        if (voteAction.voteType === 'UPVOTE') {
          // Was downvote, now upvote: +2 (upvote) + 1 (undo downvote)
          await tx.user.update({
            where: { id: submission.authorId },
            data: { reputation: clampMin(currentRep + REPUTATION_POINTS.UPVOTE_RECEIVED + Math.abs(REPUTATION_POINTS.DOWNVOTE_RECEIVED), 0) },
          })
        } else {
          // Was upvote, now downvote: -2 (undo upvote) - 1 (downvote)
          await tx.user.update({
            where: { id: submission.authorId },
            data: { reputation: clampMin(currentRep - REPUTATION_POINTS.UPVOTE_RECEIVED + REPUTATION_POINTS.DOWNVOTE_RECEIVED, 0) },
          })
        }
      }
    })

    // Fetch updated vote counts
    const [upvoteCount, downvoteCount, updatedVote] = await Promise.all([
      prisma.vote.count({ where: { submissionId, voteType: 'UPVOTE' } }),
      prisma.vote.count({ where: { submissionId, voteType: 'DOWNVOTE' } }),
      prisma.vote.findUnique({
        where: {
          submissionId_userId: { submissionId, userId: currentUser.id },
        },
      }),
    ])

    // Emit Pusher event for live vote updates
    await pusher.trigger(`submission-${submissionId}`, 'vote-update', {
      submissionId,
      upvoteCount,
      downvoteCount,
    }).catch(() => {})

    return NextResponse.json(
      apiSuccess({
        submissionId,
        userVote: updatedVote?.voteType ?? null,
        upvoteCount,
        downvoteCount,
      }),
    )
  } catch (error) {
    console.error('POST /api/votes error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}
