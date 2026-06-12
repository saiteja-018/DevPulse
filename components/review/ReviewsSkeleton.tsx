export function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full" />
            <div>
              <div className="h-4 w-24 bg-gray-800 rounded mb-1" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
            <div className="ml-auto h-3 w-20 bg-gray-800 rounded" />
          </div>
          <div className="h-4 w-full bg-gray-800 rounded mb-2" />
          <div className="h-4 w-4/5 bg-gray-800 rounded mb-2" />
          <div className="h-4 w-3/5 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  )
}
