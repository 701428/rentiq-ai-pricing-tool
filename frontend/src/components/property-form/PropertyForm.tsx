import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Loader2, Sparkles, MapPin, Navigation } from 'lucide-react'
import { analyzeProperty } from '../../api/client'
import { usePricingStore } from '../../store/pricingStore'
import type { PropertyInput } from '../../types'

const AMENITIES_OPTIONS = ['gym', 'pool', 'concierge', 'porter', 'garden', 'roof terrace', 'bike storage', 'storage']

const EMPTY_VALUES: PropertyInput = {
  address: '',
  city: '',
  zip_code: '',
  bedrooms: 2,
  bathrooms: 1,
  square_feet: 780,
  year_built: undefined,
  property_type: 'apartment',
  furnished: false,
  parking: false,
  amenities: [],
}

const COUNTRY_CURRENCY: Record<string, string> = {
  IN: 'INR', GB: 'GBP', US: 'USD', AU: 'AUD', SG: 'SGD',
  AE: 'AED', CA: 'CAD', JP: 'JPY', ZA: 'ZAR',
  DE: 'EUR', FR: 'EUR', NL: 'EUR', ES: 'EUR', IT: 'EUR',
}

interface NominatimResult {
  place_id: number
  display_name: string
  name: string
  address: {
    road?: string
    house_number?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    county?: string
    postcode?: string
    country_code?: string
  }
  lat: string
  lon: string
  type: string
  class: string
}

async function searchAddress(query: string, nearLat?: number, nearLon?: number): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '6',
    'accept-language': 'en',
  })
  if (nearLat !== undefined && nearLon !== undefined) {
    // Bias results toward the user's current location
    params.set('viewbox', `${nearLon - 1},${nearLat + 1},${nearLon + 1},${nearLat - 1}`)
    params.set('bounded', '0')
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'RentIQ/1.0' },
  })
  return res.json()
}

async function reverseGeocode(lat: number, lon: number): Promise<Partial<PropertyInput>> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'RentIQ/1.0' } })
  const data = await res.json()
  const addr = data.address || {}
  const road = addr.road || addr.pedestrian || addr.path || ''
  const houseNumber = addr.house_number || ''
  const street = houseNumber ? `${houseNumber} ${road}` : road
  const city = addr.city || addr.town || addr.village || addr.county || ''
  const postcode = (addr.postcode || '').split('-')[0].split(' ')[0]
  const countryCode = (addr.country_code || '').toUpperCase()
  const currency = COUNTRY_CURRENCY[countryCode] || 'USD'
  return { address: street, city, zip_code: postcode, latitude: lat, longitude: lon, country_code: countryCode, currency }
}

function formatSuggestionLabel(result: NominatimResult): string {
  const addr = result.address
  const parts: string[] = []
  const road = addr.road || addr.neighbourhood || addr.suburb || result.name
  if (road) parts.push(road)
  const locality = addr.suburb || addr.neighbourhood || ''
  if (locality && locality !== road) parts.push(locality)
  const city = addr.city || addr.town || addr.village || ''
  if (city) parts.push(city)
  if (addr.postcode) parts.push(addr.postcode)
  return parts.join(', ')
}

function getSuggestionSubtext(result: NominatimResult): string {
  const addr = result.address
  return [addr.city || addr.town || addr.village, addr.county].filter(Boolean).join(', ')
}

export function PropertyForm() {
  const [form, setForm] = useState<PropertyInput>(EMPTY_VALUES)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addressWrapperRef = useRef<HTMLDivElement>(null)

  const { setLoading, isLoading, setPricingResult, setError } = usePricingStore()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAddressChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, address: value }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const results = await searchAddress(
          value,
          userLocation?.lat,
          userLocation?.lon,
        )
        setSuggestions(results)
        setSuggestionsOpen(results.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 400)
  }, [userLocation])

  const handleSelectSuggestion = (result: NominatimResult) => {
    const addr = result.address
    const road = addr.road || addr.neighbourhood || addr.suburb || result.name || ''
    const houseNumber = addr.house_number || ''
    const street = houseNumber ? `${houseNumber} ${road}` : road
    const city = addr.city || addr.town || addr.village || addr.county || ''
    const postcode = (addr.postcode || '').split('-')[0].split(' ')[0]
    const countryCode = (addr.country_code || '').toUpperCase()
    const currency = COUNTRY_CURRENCY[countryCode] || 'USD'

    setForm((prev) => ({
      ...prev,
      address: street || formatSuggestionLabel(result),
      city,
      zip_code: postcode,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      country_code: countryCode,
      currency,
    }))
    setSuggestions([])
    setSuggestionsOpen(false)
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by your browser.')
      return
    }
    setGpsLoading(true)
    setGpsStatus('Detecting your location...')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          setUserLocation({ lat: latitude, lon: longitude })
          setGpsStatus(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} — looking up address...`)
          const locationData = await reverseGeocode(latitude, longitude)
          setForm((prev) => ({ ...prev, ...locationData }))
          setGpsStatus(`✓ Location detected: ${locationData.address}, ${locationData.city}`)
        } catch {
          setGpsStatus('Could not look up address for your coordinates.')
        } finally {
          setGpsLoading(false)
        }
      },
      (err) => {
        setGpsLoading(false)
        setGpsStatus(`Location error: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const set = (key: keyof PropertyInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeProperty(form)
      setPricingResult(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze. Check the backend is running.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
          <Sparkles className="w-4 h-4" />
          AI-Powered Rental Pricing
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Find the right rent, <span className="text-blue-600">instantly</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-lg mx-auto">
          Enter your property details and our AI will analyse comparables, local factors, and market data to recommend the optimal rental price.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">

        {/* GPS Detect */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={gpsLoading}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl text-blue-600 font-medium text-sm transition-colors disabled:opacity-60"
          >
            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {gpsLoading ? 'Detecting location...' : 'Use My Current Location (GPS)'}
          </button>
          {gpsStatus && (
            <p className={`text-xs px-1 ${gpsStatus.startsWith('✓') ? 'text-green-600' : 'text-gray-500'}`}>
              {gpsStatus}
            </p>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or enter manually</span></div>
        </div>

        {/* Address with autocomplete */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2" ref={addressWrapperRef}>
            <label className="label">Street Address</label>
            <div className="relative">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  className="input-field pl-9 pr-9"
                  value={form.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                  placeholder="Search address or area..."
                  autoComplete="off"
                  required
                />
                {suggestionsLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {suggestionsOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map((result, i) => (
                    <button
                      key={result.place_id}
                      type="button"
                      onMouseDown={() => handleSelectSuggestion(result)}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {formatSuggestionLabel(result)}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {getSuggestionSubtext(result)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">City</label>
            <input
              className="input-field"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="City"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Postcode / Zip</label>
            <input
              className="input-field"
              value={form.zip_code}
              onChange={(e) => set('zip_code', e.target.value)}
              placeholder="e.g. 302001"
              required
            />
          </div>
          <div>
            <label className="label">Property Type</label>
            <select
              className="input-field"
              value={form.property_type}
              onChange={(e) => set('property_type', e.target.value as PropertyInput['property_type'])}
            >
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
            </select>
          </div>
          <div>
            <label className="label">Year Built</label>
            <input
              type="number"
              className="input-field"
              value={form.year_built ?? ''}
              onChange={(e) => set('year_built', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 2005"
            />
          </div>
        </div>

        {/* Rooms */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Bedrooms</label>
            <select className="input-field" value={form.bedrooms} onChange={(e) => set('bedrooms', Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bathrooms</label>
            <select className="input-field" value={form.bathrooms} onChange={(e) => set('bathrooms', Number(e.target.value))}>
              {[1, 1.5, 2, 2.5, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Size (sq ft)</label>
            <input
              type="number"
              className="input-field"
              value={form.square_feet}
              onChange={(e) => set('square_feet', Number(e.target.value))}
              min={100}
              max={10000}
              required
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          {[
            { key: 'furnished' as const, label: 'Furnished' },
            { key: 'parking' as const, label: 'Parking' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className={`w-11 h-6 rounded-full transition-colors relative ${form[key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                onClick={() => set(key, !form[key])}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form[key] ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {/* Amenities */}
        <div>
          <label className="label">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES_OPTIONS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  form.amenities.includes(a)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Analysing property with AI...</>
          ) : (
            <><Search className="w-5 h-5" />Get AI Price Recommendation</>
          )}
        </button>
      </form>
    </div>
  )
}
