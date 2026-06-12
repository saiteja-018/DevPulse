export default function FeedLoading() {
  return (
    <div className="space-y-4">
      <div className="mb-8">
        <div className="h-8 w-64 bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-96 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Filter skeleton */}
      <div className="flex gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Card skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-800 rounded-full" />
            <div className="h-4 w-32 bg-gray-800 rounded" />
            <div className="ml-auto h-4 w-16 bg-gray-800 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-gray-800 rounded mb-2" />
          <div className="h-4 w-full bg-gray-800 rounded mb-1" />
          <div className="h-4 w-2/3 bg-gray-800 rounded mb-4" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-800 rounded-full" />
            <div className="h-6 w-20 bg-gray-800 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
