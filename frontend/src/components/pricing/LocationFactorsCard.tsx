import { GraduationCap, Volume2, Droplets, Trees, Footprints, ShoppingBag } from 'lucide-react'
import type { LocationFactors } from '../../types'

interface Props {
  factors: LocationFactors
  title?: string
}

const schoolColor = (r: string) => {
  const map: Record<string, string> = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-yellow-100 text-yellow-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-700' }
  return map[r] || 'bg-gray-100 text-gray-700'
}

const noiseColor = (n: string) => {
  const map: Record<string, string> = { quiet: 'bg-green-100 text-green-700', moderate: 'bg-yellow-100 text-yellow-700', loud: 'bg-red-100 text-red-700' }
  return map[n] || 'bg-gray-100 text-gray-700'
}

const floodColor = (f: string) => {
  const map: Record<string, string> = { none: 'bg-green-100 text-green-700', low: 'bg-yellow-100 text-yellow-700', medium: 'bg-orange-100 text-orange-700', high: 'bg-red-100 text-red-700' }
  return map[f] || 'bg-gray-100 text-gray-700'
}

export function LocationFactorsCard({ factors, title = 'Location Factors' }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
          <GraduationCap className="w-4 h-4 text-gray-500" />
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${schoolColor(factors.school_rating)}`}>
            {factors.school_rating}
          </span>
          <span className="text-xs text-gray-500">Schools</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
          <Volume2 className="w-4 h-4 text-gray-500" />
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${noiseColor(factors.noise_level)}`}>
            {factors.noise_level}
          </span>
          <span className="text-xs text-gray-500">Noise</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
          <Droplets className="w-4 h-4 text-gray-500" />
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${floodColor(factors.flood_risk)}`}>
            {factors.flood_risk}
          </span>
          <span className="text-xs text-gray-500">Flood</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
          <Trees className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-900">{factors.parks_nearby}</span>
          <span className="text-xs text-gray-500">Parks</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
          <Footprints className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-900">{factors.walkability_score}</span>
          <span className="text-xs text-gray-500">Walk</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
          <ShoppingBag className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-900">{factors.shops_nearby}</span>
          <span className="text-xs text-gray-500">Shops</span>
        </div>
      </div>
    </div>
  )
}
