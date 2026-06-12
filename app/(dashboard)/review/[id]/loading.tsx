export default function ReviewDetailLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Submission card skeleton */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
          <div className="flex gap-3 mb-4">
            <div className="h-6 w-20 bg-gray-800 rounded-full" />
            <div className="h-6 w-24 bg-gray-800 rounded-full" />
          </div>
          <div className="h-8 w-3/4 bg-gray-800 rounded mb-3" />
          <div className="h-4 w-full bg-gray-800 rounded mb-2" />
          <div className="h-4 w-5/6 bg-gray-800 rounded mb-6" />
          <div className="h-64 bg-gray-800 rounded-lg" />
        </div>

        {/* Reviews skeleton */}
        <div>
          <div className="h-7 w-32 bg-gray-800 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full" />
                  <div className="h-4 w-24 bg-gray-800 rounded" />
                  <div className="ml-auto h-4 w-12 bg-gray-800 rounded" />
                </div>
                <div className="h-4 w-full bg-gray-800 rounded mb-2" />
                <div className="h-4 w-4/5 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
          <div className="h-4 w-16 bg-gray-800 rounded mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-full" />
            <div>
              <div className="h-4 w-24 bg-gray-800 rounded mb-1" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
