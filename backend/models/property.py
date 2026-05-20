from pydantic import BaseModel
from typing import List, Optional


class PropertyInput(BaseModel):
    address: str
    city: str
    zip_code: str
    bedrooms: int
    bathrooms: float
    square_feet: int
    year_built: Optional[int] = None
    property_type: str  # apartment | house | condo | townhouse
    furnished: bool = False
    parking: bool = False
    amenities: List[str] = []
    # GPS coordinates — optional, sent from browser geolocation
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country_code: Optional[str] = None   # ISO 3166-1 alpha-2, e.g. "IN", "GB", "US"
    currency: Optional[str] = None       # e.g. "INR", "GBP", "USD"
