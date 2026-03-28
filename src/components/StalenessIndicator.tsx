import type { StalenessLevel } from '@/lib/staleness'
import clsx from 'clsx'

interface StalenessIndicatorProps {
  level: StalenessLevel
  daysAgo: number
}

export default function StalenessIndicator({ level, daysAgo }: StalenessIndicatorProps) {
  if (level === 'current') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Current
      </span>
    )
  }

  if (level === 'warning') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Warning — {daysAgo}d
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      Critical — {daysAgo}d
    </span>
  )
}
