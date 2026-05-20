export interface PropertyInput {
  address: string
  city: string
  zip_code: string
  bedrooms: number
  bathrooms: number
  square_feet: number
  year_built?: number
  property_type: 'apartment' | 'house' | 'condo' | 'townhouse'
  furnished: boolean
  parking: boolean
  amenities: string[]
  latitude?: number
  longitude?: number
  country_code?: string
  currency?: string
}

export interface LocationFactors {
  school_rating: 'A' | 'B' | 'C' | 'D' | 'F'
  noise_level: 'quiet' | 'moderate' | 'loud'
  flood_risk: 'none' | 'low' | 'medium' | 'high'
  parks_nearby: number
  walkability_score: number
  shops_nearby: number
}

export interface ComparableProperty {
  id: string
  address: string
  distance_km: number
  bedrooms: number
  bathrooms: number
  square_feet: number
  listed_price: number
  days_on_market: number
  location_factors: LocationFactors
  similarity_score: number
  weight: number
}

export interface PricingResult {
  session_id: string
  recommended_price: number
  price_range_low: number
  price_range_high: number
  confidence_score: number
  reasoning: string
  comparables: ComparableProperty[]
  removed_comparables: string[]
  location_factors: LocationFactors
  currency: string
}

export interface ParsedAdjustment {
  action: string
  comparable_ids: string[]
  factor?: string
  direction?: string
  reasoning: string
}

export interface FeedbackResult {
  acknowledgment: string
  adjustments_applied: ParsedAdjustment[]
  updated_pricing: PricingResult
}

export interface FeedbackEntry {
  timestamp: string
  user_text: string
  acknowledgment: string
  adjustments: ParsedAdjustment[]
}
