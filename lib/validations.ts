import { z } from 'zod'
import { SUPPORTED_LANGUAGES } from './constants'

export const createSubmissionSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  codeContent: z
    .string()
    .min(10, 'Code must be at least 10 characters')
    .max(50000, 'Code must be at most 50000 characters'),
  language: z.enum(SUPPORTED_LANGUAGES as unknown as [string, ...string[]], {
    message: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
  }),
  difficultyTag: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  tagIds: z
    .array(z.string())
    .min(1, 'At least 1 tag required')
    .max(5, 'At most 5 tags allowed'),
})

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>

export const createReviewSchema = z.object({
  submissionId: z.string().cuid('Invalid submission ID format'),
  content: z
    .string()
    .min(30, 'Review must be at least 30 characters')
    .max(5000, 'Review must be at most 5000 characters'),
  lineReference: z.number().int().positive('Line reference must be a positive integer').optional(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const voteSchema = z.object({
  submissionId: z.string().cuid('Invalid submission ID'),
  voteType: z.enum(['UPVOTE', 'DOWNVOTE']),
})

export type VoteInput = z.infer<typeof voteSchema>
