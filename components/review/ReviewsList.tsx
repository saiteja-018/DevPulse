'use client'

import { useState, useEffect } from 'react'
import Pusher from 'pusher-js'
import { ReviewForm } from '@/components/forms/ReviewForm'

type ReviewWithReviewer = {
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

type Props = {
  initialReviews: ReviewWithReviewer[]
  submissionId: string
}

export function ReviewsList({ initialReviews, submissionId }: Props) {
  const [reviews, setReviews] = useState(initialReviews)

  // Subscribe to real-time new reviews via Pusher
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'us2',
    })

    const channel = pusher.subscribe(`submission-${submissionId}`)
    channel.bind('new-review', (data: { review: ReviewWithReviewer }) => {
      setReviews((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.id === data.review.id)) return prev
        return [data.review, ...prev]
      })
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`submission-${submissionId}`)
    }
  }, [submissionId])

  const handleNewReview = (review: ReviewWithReviewer) => {
    setReviews((prev) => [review, ...prev])
  }

  const handleResolve = async (reviewId: string) => {
    const res = await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, isResolved: true }),
    })

    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, isResolved: true } : r)),
      )
    }
  }

  // const currentUserId = (session?.user as { id?: string })?.id

  return (
    <div className="space-y-4">
      {/* Review Form */}
      <ReviewForm
        submissionId={submissionId}
        onReviewCreated={handleNewReview}
      />

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          No reviews yet. Be the first to review!
        </div>
      ) : (
        reviews.map((review) => (
          <div
            key={review.id}
            className={`bg-gray-900 border rounded-xl p-5 transition-colors ${
              review.isResolved ? 'border-green-500/20' : 'border-gray-800'
            }`}
          >
            {/* Review header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {review.reviewer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.reviewer.avatarUrl}
                    alt={review.reviewer.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                    {review.reviewer.displayName[0]}
                  </div>
                )}
                <div>
                  <a
                    href={`/profile/${review.reviewer.username}`}
                    className="text-white text-sm font-medium hover:text-indigo-400 transition-colors"
                  >
                    {review.reviewer.displayName}
                  </a>
                  <div className="flex items-center gap-2">
                    {/* Rating stars */}
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-xs ${i < review.rating ? 'text-yellow-400' : 'text-gray-700'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    {review.lineReference && (
                      <span className="text-xs text-gray-600 font-mono">Line {review.lineReference}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {review.isResolved && (
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                    ✓ Resolved
                  </span>
                )}
                {!review.isResolved && (
                  <button
                    id={`resolve-review-btn-${review.id}`}
                    onClick={() => handleResolve(review.id)}
                    className="text-xs text-gray-500 hover:text-green-400 transition-colors"
                    title="Mark as resolved"
                  >
                    Mark resolved
                  </button>
                )}
                <span className="text-xs text-gray-600">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Review content */}
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {review.content}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
