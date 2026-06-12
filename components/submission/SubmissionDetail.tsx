'use client'

import { useState } from 'react'

type Props = {
  submission: {
    id: string
    title: string
    description: string
    codeContent: string
    language: string
    status: string
    difficultyTag: string
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
    _count: { reviews: number; votes: number }
    tags: Array<{ id: string; name: string; color: string }>
    userVote: string | null
    snapshots?: Array<{ id: string; imageUrl: string; uploadedAt: string }>
    votes?: Array<{ voteType: string }>
  }
  currentUserId: string | null
}

export function SubmissionDetail({ submission, currentUserId }: Props) {

  const [voteState, setVoteState] = useState<string | null>(submission.userVote)
  const [voteCount, setVoteCount] = useState(submission._count.votes)
  const [voting, setVoting] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const isOwnSubmission = currentUserId === submission.author.id
  const canVote = currentUserId && !isOwnSubmission

  async function handleVote(voteType: 'UPVOTE' | 'DOWNVOTE') {
    if (!canVote || voting) return
    setVoting(true)

    // Optimistic update
    const prevVote = voteState
    const prevCount = voteCount
    const samevote = voteState === voteType
    setVoteState(samevote ? null : voteType)
    setVoteCount((prev) => (samevote ? prev - 1 : prev + 1))

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, voteType }),
      })
      if (!res.ok) {
        setVoteState(prevVote)
        setVoteCount(prevCount)
      }
    } catch {
      setVoteState(prevVote)
      setVoteCount(prevCount)
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-mono">
            {submission.language}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
            {submission.difficultyTag}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
            {submission.status.replace('_', ' ')}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">{submission.title}</h1>
        <p className="text-gray-400">{submission.description}</p>

        {submission.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
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
      </div>

      {/* Code Toggle */}
      <div className="border-b border-gray-800">
        <button
          id="toggle-code-btn"
          onClick={() => setShowCode(!showCode)}
          className="w-full flex items-center justify-between px-6 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <span className="font-mono">Code Content</span>
          <span>{showCode ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {showCode && (
          <div className="relative">
            <pre className="p-6 text-sm text-gray-300 font-mono overflow-x-auto max-h-96 bg-gray-950 whitespace-pre-wrap break-words">
              <code>{submission.codeContent}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            id={`detail-upvote-btn`}
            onClick={() => handleVote('UPVOTE')}
            disabled={!canVote || voting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              voteState === 'UPVOTE'
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            ▲ Upvote
          </button>
          <span className="text-gray-500 text-sm font-mono">{voteCount}</span>
          <button
            id={`detail-downvote-btn`}
            onClick={() => handleVote('DOWNVOTE')}
            disabled={!canVote || voting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              voteState === 'DOWNVOTE'
                ? 'bg-red-500/20 text-red-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            ▼ Downvote
          </button>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          {new Date(submission.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Code Snapshots */}
      {submission.snapshots && submission.snapshots.length > 0 && (
        <div className="px-6 pb-6 border-t border-gray-800 pt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Code Snapshots</h4>
          <div className="grid grid-cols-2 gap-3">
            {submission.snapshots.map((snap) => (
              <a key={snap.id} href={snap.imageUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={snap.imageUrl}
                  alt="Code snapshot"
                  className="w-full h-32 object-cover rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
