import { describe, it, expect } from 'vitest'
import { resolveVoteAction } from '@/lib/utils'
import { Vote, VoteType } from '@prisma/client'

// Helper to create a mock vote object
function createMockVote(voteType: VoteType): Vote {
  return {
    id: 'vote-id-123',
    voteType,
    createdAt: new Date(),
    submissionId: 'submission-id-123',
    userId: 'user-id-123',
  }
}

// ============================================================
// resolveVoteAction Tests
// ============================================================
describe('resolveVoteAction', () => {
  describe('when there is no existing vote', () => {
    it('should return { action: "create", voteType: UPVOTE } when incoming is UPVOTE', () => {
      const result = resolveVoteAction(null, VoteType.UPVOTE)
      expect(result).toEqual({ action: 'create', voteType: VoteType.UPVOTE })
    })

    it('should return { action: "create", voteType: DOWNVOTE } when incoming is DOWNVOTE', () => {
      const result = resolveVoteAction(null, VoteType.DOWNVOTE)
      expect(result).toEqual({ action: 'create', voteType: VoteType.DOWNVOTE })
    })
  })

  describe('when there is an existing vote with the same type', () => {
    it('should return { action: "delete" } for UPVOTE toggle', () => {
      const existingVote = createMockVote(VoteType.UPVOTE)
      const result = resolveVoteAction(existingVote, VoteType.UPVOTE)
      expect(result).toEqual({ action: 'delete' })
    })

    it('should return { action: "delete" } for DOWNVOTE toggle', () => {
      const existingVote = createMockVote(VoteType.DOWNVOTE)
      const result = resolveVoteAction(existingVote, VoteType.DOWNVOTE)
      expect(result).toEqual({ action: 'delete' })
    })
  })

  describe('when there is an existing vote with a different type', () => {
    it('should return { action: "update", voteType: UPVOTE } when switching from DOWNVOTE', () => {
      const existingVote = createMockVote(VoteType.DOWNVOTE)
      const result = resolveVoteAction(existingVote, VoteType.UPVOTE)
      expect(result).toEqual({ action: 'update', voteType: VoteType.UPVOTE })
    })

    it('should return { action: "update", voteType: DOWNVOTE } when switching from UPVOTE', () => {
      const existingVote = createMockVote(VoteType.UPVOTE)
      const result = resolveVoteAction(existingVote, VoteType.DOWNVOTE)
      expect(result).toEqual({ action: 'update', voteType: VoteType.DOWNVOTE })
    })
  })

  describe('return type validation', () => {
    it('should always have an action property', () => {
      const result1 = resolveVoteAction(null, VoteType.UPVOTE)
      expect(result1).toHaveProperty('action')

      const existingVote = createMockVote(VoteType.UPVOTE)
      const result2 = resolveVoteAction(existingVote, VoteType.UPVOTE)
      expect(result2).toHaveProperty('action')

      const result3 = resolveVoteAction(existingVote, VoteType.DOWNVOTE)
      expect(result3).toHaveProperty('action')
    })

    it('should have voteType when action is create or update', () => {
      const createResult = resolveVoteAction(null, VoteType.UPVOTE)
      if (createResult.action !== 'delete') {
        expect(createResult).toHaveProperty('voteType')
      }

      const existingVote = createMockVote(VoteType.UPVOTE)
      const updateResult = resolveVoteAction(existingVote, VoteType.DOWNVOTE)
      if (updateResult.action !== 'delete') {
        expect(updateResult).toHaveProperty('voteType')
      }
    })

    it('should NOT have voteType when action is delete', () => {
      const existingVote = createMockVote(VoteType.UPVOTE)
      const deleteResult = resolveVoteAction(existingVote, VoteType.UPVOTE)
      expect(deleteResult.action).toBe('delete')
      expect((deleteResult as Record<string, unknown>).voteType).toBeUndefined()
    })
  })
})
