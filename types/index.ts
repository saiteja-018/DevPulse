import { Notification } from '@prisma/client'
import { Session } from 'next-auth'

export type SessionUser = {
  id: string
  email: string
  username: string
  displayName: string
  reputation: number
}

export type ExtendedSession = Session & {
  user: SessionUser
}

export type SubmissionWithRelations = {
  id: string
  title: string
  description: string
  codeContent: string
  language: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'REVIEWED' | 'CLOSED'
  difficultyTag: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  viewCount: number
  createdAt: string
  updatedAt: string
  authorId: string
  author: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    reputation: number
  }
  _count: {
    reviews: number
    votes: number
  }
  tags: Array<{ id: string; name: string; color: string }>
  userVote: 'UPVOTE' | 'DOWNVOTE' | null
}

export type ReviewWithReviewer = {
  id: string
  content: string
  lineReference: number | null
  rating: number
  isResolved: boolean
  createdAt: string
  updatedAt: string
  submissionId: string
  reviewerId: string
  reviewer: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    reputation: number
  }
}

export type NotificationData = Omit<Notification, 'createdAt'> & {
  createdAt: string
}

export type LeaderboardEntry = {
  rank: number
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    reputation: number
  }
  score: number
  breakdown: {
    reputationPoints: number
    reviewBonus: number
    submissionBonus: number
    voteBonus: number
  }
}

export type PaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type ApiResponse<T> = {
  data: T
  meta?: Record<string, unknown>
  error?: never
}

export type ApiError = {
  error: string
  code: string
  data?: never
}
