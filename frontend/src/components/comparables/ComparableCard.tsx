import { useState } from 'react'
import { X, Sliders, GraduationCap, Volume2, Droplets, Trees, Footprints, ShoppingBag, Loader2 } from 'lucide-react'
import type { ComparableProperty } from '../../types'
import { removeComparable, adjustWeight } from '../../api/client'
import { usePricingStore } from '../../store/pricingStore'

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', INR: '₹', AUD: 'A$',
  SGD: 'S$', AED: 'AED ', CAD: 'C$', JPY: '¥', ZAR: 'R',
}

interface Props {
  comp: ComparableProperty
}

const schoolColor = (r: string) => {
  const m: Record<string, string> = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-yellow-100 text-yellow-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-700' }
  return m[r] || 'bg-gray-100 text-gray-700'
}
const noiseColor = (n: string) => {
  const m: Record<string, string> = { quiet: 'bg-green-100 text-green-700', moderate: 'bg-yellow-100 text-yellow-700', loud: 'bg-red-100 text-red-700' }
  return m[n] || 'bg-gray-100 text-gray-700'
}
const floodColor = (f: string) => {
  const m: Record<string, string> = { none: 'bg-green-100 text-green-700', low: 'bg-yellow-100 text-yellow-700', medium: 'bg-orange-100 text-orange-700', high: 'bg-red-100 text-red-700' }
  return m[f] || 'bg-gray-100 text-gray-700'
}

export function ComparableCard({ comp }: Props) {
  const { pricingResult, updatePricingResult } = usePricingStore()
  const currency = pricingResult?.currency ?? 'GBP'
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  const [showWeight, setShowWeight] = useState(false)
  const [weight, setWeight] = useState(comp.weight)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isSavingWeight, setIsSavingWeight] = useState(false)

  const sessionId = pricingResult?.session_id ?? ''

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      const updated = await removeComparable(sessionId, comp.id)
      updatePricingResult(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setIsRemoving(false)
    }
  }

  const handleWeightSave = async () => {
    setIsSavingWeight(true)
    try {
      const updated = await adjustWeight(sessionId, comp.id, weight)
      updatePricingResult(updated)
      setShowWeight(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSavingWeight(false)
    }
  }

  const simPct = Math.round(comp.similarity_score * 100)

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{comp.address}</p>
          <p className="text-xs text-gray-500">{comp.distance_km} km away · {comp.days_on_market}d on market</p>
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <button
            onClick={() => setShowWeight(!showWeight)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            title="Adjust weight"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
            title="Remove comparable"
          >
            {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
        <span className="font-bold text-gray-900 text-base">{symbol}{comp.listed_price.toLocaleString()}/mo</span>
        <span className="text-gray-300">·</span>
        <span>{comp.bedrooms}bd</span>
        <span>{comp.bathrooms}ba</span>
        <span>{comp.square_feet.toLocaleString()} sqft</span>
        <span className="ml-auto">
          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs font-medium">{simPct}% match</span>
        </span>
      </div>

      {/* Location factors chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${schoolColor(comp.location_factors.school_rating)}`}>
          <GraduationCap className="w-3 h-3" />
          {comp.location_factors.school_rating}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${noiseColor(comp.location_factors.noise_level)}`}>
          <Volume2 className="w-3 h-3" />
          {comp.location_factors.noise_level}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${floodColor(comp.location_factors.flood_risk)}`}>
          <Droplets className="w-3 h-3" />
          flood: {comp.location_factors.flood_risk}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Trees className="w-3 h-3" />
          {comp.location_factors.parks_nearby} parks
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Footprints className="w-3 h-3" />
          {comp.location_factors.walkability_score}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <ShoppingBag className="w-3 h-3" />
          {comp.location_factors.shops_nearby} shops
        </span>
      </div>

      {/* Weight slider */}
      {showWeight && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Influence Weight</span>
            <span className="text-xs font-bold text-blue-600">{weight.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.1× (less)</span>
            <span>1.0× (normal)</span>
            <span>2.0× (more)</span>
          </div>
          <button
            onClick={handleWeightSave}
            disabled={isSavingWeight}
            className="mt-2 w-full btn-primary py-1.5 text-xs flex items-center justify-center gap-1"
          >
            {isSavingWeight ? <><Loader2 className="w-3 h-3 animate-spin" />Updating...</> : 'Apply Weight'}
          </button>
        </div>
      )}
    </div>
  )
}
