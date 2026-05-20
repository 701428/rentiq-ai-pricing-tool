from pydantic import BaseModel
from typing import List, Optional


class LocationFactors(BaseModel):
    school_rating: str       # A, B, C, D, F
    noise_level: str         # quiet, moderate, loud
    flood_risk: str          # none, low, medium, high
    parks_nearby: int
    walkability_score: int   # 0-100
    shops_nearby: int


class ComparableProperty(BaseModel):
    id: str
    address: str
    distance_km: float
    bedrooms: int
    bathrooms: float
    square_feet: int
    listed_price: int
    days_on_market: int
    location_factors: LocationFactors
    similarity_score: float
    weight: float = 1.0


class PricingResult(BaseModel):
    session_id: str
    recommended_price: int
    price_range_low: int
    price_range_high: int
    confidence_score: float
    reasoning: str
    comparables: List[ComparableProperty]
    removed_comparables: List[str] = []
    location_factors: LocationFactors
    currency: str = "GBP"
