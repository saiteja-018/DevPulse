'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Props = {
  submissionId: string
  onReviewCreated: (review: {
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
  }) => void
}

export function ReviewForm({ submissionId, onReviewCreated }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [lineReference, setLineReference] = useState('')
  const [rating, setRating] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)

  if (!session?.user) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-400 text-sm">
          <a href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</a> to leave a review
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          content,
          lineReference: lineReference ? parseInt(lineReference) : undefined,
          rating,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to submit review')
        return
      }

      setContent('')
      setLineReference('')
      setRating(5)

      if (data.data) {
        const user = session!.user as {
          id?: string
          name?: string | null
          image?: string | null
          username?: string
          displayName?: string
          reputation?: number
        }
        onReviewCreated({
          ...data.data,
          reviewer: {
            id: user.id ?? '',
            username: (user as { username?: string }).username ?? user.name ?? '',
            displayName: (user as { displayName?: string }).displayName ?? user.name ?? '',
            avatarUrl: user.image ?? null,
            reputation: (user as { reputation?: number }).reputation ?? 0,
          },
        })
      }

      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-800 rounded-xl p-5"
    >
      <h3 className="text-white font-semibold mb-4">Leave a Review</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">Rating</label>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              id={`rating-star-${i + 1}`}
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i + 1)}
              className={`text-2xl transition-colors ${
                i < (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-700'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <label htmlFor="review-content" className="block text-sm font-medium text-gray-400 mb-2">
          Review (min 30 characters)
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          minLength={30}
          maxLength={5000}
          rows={4}
          placeholder="Share your thoughts about this code..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm"
        />
        <p className="text-xs text-gray-600 mt-1">{content.length}/5000</p>
      </div>

      {/* Line Reference */}
      <div className="mb-4">
        <label htmlFor="line-reference" className="block text-sm font-medium text-gray-400 mb-2">
          Line Reference (optional)
        </label>
        <input
          id="line-reference"
          type="number"
          min="1"
          value={lineReference}
          onChange={(e) => setLineReference(e.target.value)}
          placeholder="e.g. 42"
          className="w-32 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
        />
      </div>

      <button
        id="submit-review-btn"
        type="submit"
        disabled={submitting || content.length < 30}
        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
