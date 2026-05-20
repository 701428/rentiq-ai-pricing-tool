"""
Generate realistic comparable properties from real GPS coordinates.

Uses:
- Overpass API (OpenStreetMap) to find real nearby streets
- Deterministic synthetic address generation as guaranteed fallback
- Local currency pricing model
"""
import hashlib
import httpx
from typing import List, Set
from models.pricing import ComparableProperty, LocationFactors

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

CURRENCY_RENT_BASE = {
    "INR": 45,
    "GBP": 2.8,
    "USD": 3.5,
    "EUR": 2.5,
    "AUD": 3.0,
    "SGD": 4.5,
    "AED": 6.0,
    "CAD": 3.2,
    "JPY": 300,
    "ZAR": 20,
}

# Generic street suffixes used as fallback when Overpass returns nothing
_GENERIC_SUFFIXES = [
    "Main Road", "Park Avenue", "Garden Street", "Market Road",
    "Central Avenue", "Lake View Road", "Hill Street", "Cross Road",
    "Station Road", "Church Street", "High Street", "Oak Lane",
]


def _det(seed: str, mod: int, offset: int = 0) -> int:
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    return offset + (h % mod)


def _get_area_signals(lat: float, lon: float) -> dict:
    """Query Overpass for amenity counts. Returns dict with schools/parks/shops/busy_roads/water."""
    radius = 1000
    query = f"""
[out:json][timeout:20];
(
  node["amenity"~"^(school|college|university)$"](around:{radius},{lat},{lon});
  way["amenity"~"^(school|college|university)$"](around:{radius},{lat},{lon});
  node["leisure"~"^(park|garden|playground)$"](around:{radius},{lat},{lon});
  way["leisure"~"^(park|garden)$"](around:{radius},{lat},{lon});
  node["shop"](around:{radius},{lat},{lon});
  node["amenity"~"^(supermarket|convenience|marketplace)$"](around:{radius},{lat},{lon});
  way["highway"~"^(motorway|trunk|primary)$"](around:{radius},{lat},{lon});
  node["natural"="water"](around:{radius},{lat},{lon});
  way["waterway"](around:{radius},{lat},{lon});
);
out tags;
"""
    counts = {}
    try:
        resp = httpx.post(OVERPASS_URL, data={"data": query}, timeout=25)
        data = resp.json()
        for el in data.get("elements", []):
            tags = el.get("tags", {})
            amenity = tags.get("amenity", "")
            leisure = tags.get("leisure", "")
            shop = tags.get("shop", "")
            highway = tags.get("highway", "")
            natural = tags.get("natural", "")
            waterway = tags.get("waterway", "")

            if amenity in ("school", "college", "university"):
                counts["schools"] = counts.get("schools", 0) + 1
            if leisure in ("park", "garden", "playground"):
                counts["parks"] = counts.get("parks", 0) + 1
            if shop or amenity in ("supermarket", "convenience", "marketplace"):
                counts["shops"] = counts.get("shops", 0) + 1
            if highway in ("motorway", "trunk", "primary"):
                counts["busy_roads"] = counts.get("busy_roads", 0) + 1
            if natural == "water" or waterway:
                counts["water"] = counts.get("water", 0) + 1
    except Exception:
        pass
    return counts


def _get_nearby_streets(lat: float, lon: float, needed: int = 12) -> List[str]:
    """Fetch real nearby street names from Overpass. Returns unique named streets."""
    radius = 2000
    query = f"""
[out:json][timeout:20];
way["highway"~"^(residential|tertiary|secondary|living_street|unclassified|service)$"]
  ["name"]
  (around:{radius},{lat},{lon});
out tags;
"""
    streets = []
    try:
        resp = httpx.post(OVERPASS_URL, data={"data": query}, timeout=25)
        data = resp.json()
        seen = set()
        for el in data.get("elements", []):
            name = el.get("tags", {}).get("name", "").strip()
            if name and name not in seen:
                seen.add(name)
                streets.append(name)
            if len(streets) >= needed:
                break
    except Exception:
        pass
    return streets


def _get_city_from_nominatim(lat: float, lon: float) -> str:
    """Get city/locality name for synthetic address generation."""
    try:
        r = httpx.get(
            NOMINATIM_URL,
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": "RentIQ-prototype/1.0"},
            timeout=10,
        )
        addr = r.json().get("address", {})
        return (
            addr.get("suburb")
            or addr.get("neighbourhood")
            or addr.get("quarter")
            or addr.get("city_district")
            or addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or "Local Area"
        )
    except Exception:
        return "Local Area"


def _derive_location_factors(lat: float, lon: float, area_signals: dict) -> LocationFactors:
    seed = f"{lat:.3f},{lon:.3f}"
    schools = area_signals.get("schools", 0)
    parks = area_signals.get("parks", 0)
    shops = area_signals.get("shops", 0)
    busy_roads = area_signals.get("busy_roads", 0)
    water = area_signals.get("water", 0)

    if schools >= 3:
        school_rating = "A"
    elif schools == 2:
        school_rating = "B"
    elif schools == 1:
        school_rating = "C"
    else:
        school_rating = ["B", "C", "C", "D"][_det(seed + "sch", 4)]

    if busy_roads >= 3:
        noise_level = "loud"
    elif busy_roads >= 1:
        noise_level = "moderate"
    else:
        noise_level = ["quiet", "quiet", "moderate"][_det(seed + "noise", 3)]

    if water >= 2:
        flood_risk = "medium"
    elif water == 1:
        flood_risk = "low"
    else:
        flood_risk = "none"

    parks_count = max(parks, _det(seed + "pk", 4, 1))
    walkability = max(40, min(98, 52 + shops * 2 + parks * 3 + schools * 4 - busy_roads * 3))
    shops_count = max(shops, _det(seed + "sh", 12, 5))

    return LocationFactors(
        school_rating=school_rating,
        noise_level=noise_level,
        flood_risk=flood_risk,
        parks_nearby=parks_count,
        walkability_score=walkability,
        shops_nearby=shops_count,
    )


def _estimate_base_price(
    bedrooms: int,
    bathrooms: float,
    square_feet: int,
    location_factors: LocationFactors,
    currency: str,
) -> int:
    rate = CURRENCY_RENT_BASE.get(currency, 3.0)
    base = square_feet * rate

    school_mult = {"A": 1.22, "B": 1.10, "C": 1.00, "D": 0.88, "F": 0.75}
    base *= school_mult.get(location_factors.school_rating, 1.0)

    noise_mult = {"quiet": 1.08, "moderate": 1.00, "loud": 0.88}
    base *= noise_mult.get(location_factors.noise_level, 1.0)

    flood_mult = {"none": 1.00, "low": 0.97, "medium": 0.91, "high": 0.83}
    base *= flood_mult.get(location_factors.flood_risk, 1.0)

    base *= 1.0 + (location_factors.walkability_score - 70) * 0.002
    base += (bedrooms - 2) * rate * 80
    base += (bathrooms - 1) * rate * 40

    return max(int(round(base / 500) * 500), 1000)


def get_geo_comparables(
    subject: dict,
    lat: float,
    lon: float,
    currency: str,
    removed_ids: Set[str],
    weight_overrides: dict,
    max_results: int = 6,
) -> List[ComparableProperty]:
    """Generate comparable properties centred on the user's real GPS location."""

    area_signals = _get_area_signals(lat, lon)
    streets = _get_nearby_streets(lat, lon, needed=max_results * 3)

    # If Overpass returned few/no streets, get the locality name and build synthetic ones
    if len(streets) < max_results:
        locality = _get_city_from_nominatim(lat, lon)
        seed_loc = f"{lat:.2f},{lon:.2f}"
        for i, suffix in enumerate(_GENERIC_SUFFIXES):
            synthetic = f"{locality} {suffix}"
            if synthetic not in streets:
                streets.append(synthetic)
            if len(streets) >= max_results * 2:
                break

    comparables = []
    used_ids: Set[str] = set()
    idx = 0

    for street in streets:
        if len(comparables) >= max_results:
            break

        seed = f"{lat:.3f},{lon:.3f}|{street}|{idx}"
        idx += 1

        comp_id = f"geo_{hashlib.md5(seed.encode()).hexdigest()[:10]}"
        if comp_id in removed_ids or comp_id in used_ids:
            continue
        used_ids.add(comp_id)

        bed_delta = _det(seed + "bd", 3) - 1
        beds = max(1, subject.get("bedrooms", 2) + bed_delta)

        bath_options = [1.0, 1.0, 1.5, 2.0]
        baths = bath_options[_det(seed + "ba", len(bath_options))]

        sqft_var = 1.0 + (_det(seed + "sf", 31) - 15) / 100
        sqft = max(300, int(subject.get("square_feet", 800) * sqft_var))

        distance = round(0.1 + _det(seed + "dist", 150) / 100, 2)

        # Vary signals slightly per comparable
        comp_signals = {
            k: max(0, v + _det(seed + k, 3) - 1)
            for k, v in area_signals.items()
        }
        comp_lf = _derive_location_factors(
            lat + (_det(seed + "dlat", 11) - 5) * 0.001,
            lon + (_det(seed + "dlon", 11) - 5) * 0.001,
            comp_signals,
        )

        comp_base = _estimate_base_price(beds, baths, sqft, comp_lf, currency)
        price_var = 1.0 + (_det(seed + "pv", 21) - 10) / 100
        listed_price = int(round(comp_base * price_var / 500) * 500)

        dom = _det(seed + "dom", 45, 2)
        house_num = _det(seed + "hn", 150, 1)
        address = f"{house_num} {street}"

        sim_score = round(max(0.4, 1.0 - abs(bed_delta) * 0.2 - abs(sqft_var - 1.0) * 0.5), 3)
        weight = weight_overrides.get(comp_id, 1.0)

        comparables.append(
            ComparableProperty(
                id=comp_id,
                address=address,
                distance_km=distance,
                bedrooms=beds,
                bathrooms=baths,
                square_feet=sqft,
                listed_price=listed_price,
                days_on_market=dom,
                location_factors=comp_lf,
                similarity_score=sim_score,
                weight=weight,
            )
        )

    comparables.sort(key=lambda c: -c.similarity_score)
    return comparables
