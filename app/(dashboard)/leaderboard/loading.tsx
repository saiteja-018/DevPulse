export default function LeaderboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-800 rounded animate-pulse" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="h-10 bg-gray-800/50 animate-pulse" />

        {/* Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-800 items-center animate-pulse"
          >
            <div className="col-span-1">
              <div className="w-7 h-7 bg-gray-800 rounded-full" />
            </div>
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-800 rounded-full" />
              <div>
                <div className="h-4 w-24 bg-gray-800 rounded mb-1" />
                <div className="h-3 w-16 bg-gray-800 rounded" />
              </div>
            </div>
            <div className="col-span-2 flex justify-end">
              <div className="h-4 w-16 bg-gray-800 rounded" />
            </div>
            <div className="col-span-2 flex justify-end">
              <div className="h-4 w-12 bg-gray-800 rounded" />
            </div>
            <div className="col-span-2 flex justify-end">
              <div className="h-4 w-12 bg-gray-800 rounded" />
            </div>
            <div className="col-span-1 flex justify-end">
              <div className="h-4 w-8 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
