'use client'

import { ContributionDay } from '@/lib/utils'

type Props = {
  data: ContributionDay[]
}

export function ContributionGraph({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  function getColor(count: number): string {
    if (count === 0) return 'bg-gray-800'
    const intensity = count / maxCount
    if (intensity < 0.25) return 'bg-indigo-900'
    if (intensity < 0.5) return 'bg-indigo-700'
    if (intensity < 0.75) return 'bg-indigo-500'
    return 'bg-indigo-400'
  }

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {data.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
            className={`w-4 h-4 rounded-sm transition-colors cursor-help ${getColor(day.count)}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-600">30 days ago</span>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <span>Less</span>
          {['bg-gray-800', 'bg-indigo-900', 'bg-indigo-700', 'bg-indigo-500', 'bg-indigo-400'].map(
            (cls) => (
              <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} />
            ),
          )}
          <span>More</span>
        </div>
        <span className="text-xs text-gray-600">Today</span>
      </div>
    </div>
  )
}
