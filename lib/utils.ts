import { Vote, VoteType } from '@prisma/client'
import prisma from './prisma'

// ============================================================
// Leaderboard Score Computation
// ============================================================

export type LeaderboardUser = {
  reputation: number
  totalReviewsGiven: number
  totalSubmissions: number
  netVotesReceived: number
}

/**
 * Computes the composite leaderboard score for a user.
 * Formula: (reputation * 1.0) + (total_reviews_given * 15) + (total_submissions * 10) + (net_votes_received * 2)
 * Returns a number rounded to 2 decimal places.
 */
export function computeLeaderboardScore(user: LeaderboardUser): number {
  const score =
    user.reputation * 1.0 +
    user.totalReviewsGiven * 15 +
    user.totalSubmissions * 10 +
    user.netVotesReceived * 2

  return Math.round(score * 100) / 100
}

// ============================================================
// Contribution Data
// ============================================================

export type ContributionDay = {
  date: string // ISO date string, format: YYYY-MM-DD
  count: number // total submissions + reviews on that day
}

/**
 * Returns exactly 30 items representing the last 30 days of activity.
 * Days with no activity are included with count: 0.
 */
export async function getContributionData(userId: string): Promise<ContributionDay[]> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  // Fetch submissions and reviews in parallel
  const [submissions, reviews] = await Promise.all([
    prisma.submission.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    }),
    prisma.review.findMany({
      where: {
        reviewerId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    }),
  ])

  // Build a map of date -> count
  const countMap = new Map<string, number>()

  for (const sub of submissions) {
    const dateKey = sub.createdAt.toISOString().split('T')[0]
    countMap.set(dateKey, (countMap.get(dateKey) ?? 0) + 1)
  }

  for (const rev of reviews) {
    const dateKey = rev.createdAt.toISOString().split('T')[0]
    countMap.set(dateKey, (countMap.get(dateKey) ?? 0) + 1)
  }

  // Build the 30-day array
  const result: ContributionDay[] = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    result.push({
      date: dateKey,
      count: countMap.get(dateKey) ?? 0,
    })
  }

  return result
}

// ============================================================
// File Upload Validation
// ============================================================

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Validates an uploaded file for type and size constraints.
 */
export function validateUploadedFile(file: File): { valid: boolean; error: string | null } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Only JPEG, PNG, and WebP images are allowed. Received: ${file.type}`,
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 5MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  return { valid: true, error: null }
}

// ============================================================
// Vote Resolution Logic
// ============================================================

export type VoteAction =
  | { action: 'create'; voteType: VoteType }
  | { action: 'update'; voteType: VoteType }
  | { action: 'delete' }

/**
 * Pure function that determines what action to take for a vote.
 * - No existing vote → create
 * - Same vote type → delete (toggle off)
 * - Different vote type → update
 */
export function resolveVoteAction(existingVote: Vote | null, incomingVoteType: VoteType): VoteAction {
  if (!existingVote) {
    return { action: 'create', voteType: incomingVoteType }
  }

  if (existingVote.voteType === incomingVoteType) {
    return { action: 'delete' }
  }

  return { action: 'update', voteType: incomingVoteType }
}

// ============================================================
// General Utilities
// ============================================================

/**
 * Formats a date to YYYY-MM-DD string
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Creates a hash of an object for use as a cache key
 */
export async function hashObject(obj: Record<string, unknown>): Promise<string> {
  const sorted = Object.keys(obj)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = obj[key]
        return acc
      },
      {} as Record<string, unknown>,
    )

  const str = JSON.stringify(sorted)
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Builds a standardized success API response
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return { data, ...(meta ? { meta } : {}) }
}

/**
 * Builds a standardized error API response
 */
export function apiError(error: string, code: string) {
  return { error, code }
}

/**
 * Clamps a number to a minimum value
 */
export function clampMin(value: number, min: number): number {
  return Math.max(value, min)
}
