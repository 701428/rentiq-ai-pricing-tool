import { usePricingStore } from '../store/pricingStore'
import { PricingCard } from '../components/pricing/PricingCard'
import { LocationFactorsCard } from '../components/pricing/LocationFactorsCard'
import { ComparablesList } from '../components/comparables/ComparablesList'
import { FeedbackPanel } from '../components/feedback/FeedbackPanel'
import { RotateCcw } from 'lucide-react'

export function ResultsPage() {
  const { pricingResult, reset, lastAcknowledgment } = usePricingStore()
  if (!pricingResult) return null

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Session info bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pricing Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Session · {pricingResult.session_id.slice(0, 8)}...</p>
        </div>
        <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm">
          <RotateCcw className="w-4 h-4" />
          New Analysis
        </button>
      </div>

      {/* AI acknowledgment toast */}
      {lastAcknowledgment && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-sm flex items-start gap-2">
          <span>🤖</span>
          <span>{lastAcknowledgment}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <PricingCard result={pricingResult} />
          <ComparablesList comparables={pricingResult.comparables} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <LocationFactorsCard
            factors={pricingResult.location_factors}
            title="Subject Property Location"
          />
          <FeedbackPanel />

          {/* Removed comparables */}
          {pricingResult.removed_comparables.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Removed Comparables ({pricingResult.removed_comparables.length})
              </p>
              <div className="space-y-1">
                {pricingResult.removed_comparables.map((id) => (
                  <div key={id} className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
                    {id}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
