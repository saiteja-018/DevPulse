'use client'

export default function ReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">🔍</div>
      <h2 className="text-xl font-bold text-white mb-2">Failed to load submission</h2>
      <p className="text-gray-400 mb-6 max-w-sm">{error.message || 'Something went wrong loading this submission.'}</p>
      <button
        id="review-error-retry-btn"
        onClick={reset}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}
