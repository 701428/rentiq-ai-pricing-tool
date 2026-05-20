import { useState } from 'react'
import { TrendingUp, ChevronDown, ChevronUp, Info } from 'lucide-react'
import type { PricingResult } from '../../types'

interface Props {
  result: PricingResult
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 75 ? 'green' : pct >= 50 ? 'yellow' : 'red'
  const colorMap = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  }
  const label = pct >= 75 ? 'High Confidence' : pct >= 50 ? 'Medium Confidence' : 'Low Confidence'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorMap[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
      {label} · {pct}%
    </span>
  )
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', INR: '₹', AUD: 'A$',
  SGD: 'S$', AED: 'AED ', CAD: 'C$', JPY: '¥', ZAR: 'R',
}

export function PricingCard({ result }: Props) {
  const [showReasoning, setShowReasoning] = useState(false)

  const symbol = CURRENCY_SYMBOLS[result.currency] ?? result.currency + ' '
  const fmt = (n: number) => `${symbol}${n.toLocaleString()}`

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Price Recommendation</h2>
            <p className="text-xs text-gray-500">Based on {result.comparables.length} comparables</p>
          </div>
        </div>
        <ConfidenceBadge score={result.confidence_score} />
      </div>

      {/* Price */}
      <div className="text-center py-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl mb-4">
        <div className="text-5xl font-bold text-gray-900 mb-1">
          {fmt(result.recommended_price)}
          <span className="text-xl font-normal text-gray-500">/mo</span>
        </div>
        <div className="text-sm text-gray-500">
          Range: <span className="font-medium text-gray-700">{fmt(result.price_range_low)} – {fmt(result.price_range_high)}</span>
        </div>

        {/* Confidence bar */}
        <div className="mt-4 mx-auto w-48">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                result.confidence_score >= 0.75 ? 'bg-green-500' : result.confidence_score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${result.confidence_score * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reasoning toggle */}
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 hover:bg-gray-50 rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          AI Reasoning
        </span>
        {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showReasoning && (
        <div className="mt-2 p-4 bg-blue-50 rounded-lg text-sm text-gray-700 leading-relaxed border border-blue-100">
          <p className="font-medium text-blue-800 mb-1">Why this price?</p>
          {result.reasoning}
        </div>
      )}
    </div>
  )
}
