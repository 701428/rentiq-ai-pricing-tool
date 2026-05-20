import { LayoutList } from 'lucide-react'
import type { ComparableProperty } from '../../types'
import { ComparableCard } from './ComparableCard'

interface Props {
  comparables: ComparableProperty[]
}

export function ComparablesList({ comparables }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <LayoutList className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-900">Comparable Properties</h2>
        <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
          {comparables.length} active
        </span>
      </div>
      {comparables.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">All comparables removed.</p>
          <p className="text-xs mt-1">Confidence will be very low — consider restoring some.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comparables.map((comp) => (
            <ComparableCard key={comp.id} comp={comp} />
          ))}
        </div>
      )}
    </div>
  )
}
