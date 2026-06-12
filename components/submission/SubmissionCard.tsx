'use client'

import Link from 'next/link'
import { SubmissionStatus, DifficultyTag } from '@prisma/client'

type Submission = {
  id: string
  title: string
  description: string
  language: string
  status: SubmissionStatus
  difficultyTag: DifficultyTag
  viewCount: number
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    reputation: number
  }
  _count: { reviews: number; votes: number }
  tags: Array<{ id: string; name: string; color: string }>
  userVote: 'UPVOTE' | 'DOWNVOTE' | null
}

type Props = {
  submission: Submission
  currentUserId: string | null
  onVote: (voteType: 'UPVOTE' | 'DOWNVOTE') => void
}

const statusColors: Record<SubmissionStatus, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  REVIEWED: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLOSED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const difficultyColors: Record<DifficultyTag, string> = {
  BEGINNER: 'bg-emerald-500/10 text-emerald-400',
  INTERMEDIATE: 'bg-blue-500/10 text-blue-400',
  ADVANCED: 'bg-orange-500/10 text-orange-400',
  EXPERT: 'bg-red-500/10 text-red-400',
}

export function SubmissionCard({ submission, currentUserId, onVote }: Props) {
  const isOwnSubmission = currentUserId === submission.author.id
  const canVote = currentUserId && !isOwnSubmission

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[submission.status]}`}
        >
          {submission.status.replace('_', ' ')}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[submission.difficultyTag]}`}>
          {submission.difficultyTag}
        </span>
        <span className="text-xs text-gray-600 font-mono ml-1">{submission.language}</span>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
          <span>👁 {submission.viewCount}</span>
          <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Title */}
      <Link href={`/review/${submission.id}`}>
        <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors mb-2 line-clamp-1">
          {submission.title}
        </h3>
      </Link>

      {/* Description */}
      <p className="text-gray-400 text-sm line-clamp-2 mb-4">{submission.description}</p>

      {/* Tags */}
      {submission.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {submission.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        {/* Author */}
        <Link
          href={`/profile/${submission.author.username}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {submission.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={submission.author.avatarUrl}
              alt={submission.author.displayName}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs">
              {submission.author.displayName[0]}
            </div>
          )}
          <span className="text-sm text-gray-400">{submission.author.displayName}</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href={`/review/${submission.id}`}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            💬 {submission._count.reviews}
          </Link>

          <div className="flex items-center gap-1">
            <button
              id={`upvote-btn-${submission.id}`}
              onClick={() => canVote && onVote('UPVOTE')}
              disabled={!canVote}
              className={`p-1 rounded transition-colors ${
                submission.userVote === 'UPVOTE'
                  ? 'text-indigo-400'
                  : 'text-gray-600 hover:text-gray-300'
              } disabled:cursor-not-allowed`}
              title={isOwnSubmission ? "Can't vote on own submission" : 'Upvote'}
            >
              ▲
            </button>
            <span className="text-sm text-gray-500 min-w-[20px] text-center">
              {submission._count.votes}
            </span>
            <button
              id={`downvote-btn-${submission.id}`}
              onClick={() => canVote && onVote('DOWNVOTE')}
              disabled={!canVote}
              className={`p-1 rounded transition-colors ${
                submission.userVote === 'DOWNVOTE'
                  ? 'text-red-400'
                  : 'text-gray-600 hover:text-gray-300'
              } disabled:cursor-not-allowed`}
              title={isOwnSubmission ? "Can't vote on own submission" : 'Downvote'}
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
