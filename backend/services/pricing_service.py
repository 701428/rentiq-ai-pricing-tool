"""Orchestrates the full pricing pipeline."""
from models.property import PropertyInput
from models.pricing import PricingResult
from services.comparables_service import get_comparables
from services.geo_comparables_service import get_geo_comparables, _derive_location_factors, _get_area_signals
from services.location_service import get_location_factors
from services import claude_service
from store import session_store


def _get_currency(prop: dict) -> str:
    if prop.get("currency"):
        return prop["currency"]
    country = (prop.get("country_code") or "").upper()
    mapping = {
        "IN": "INR", "GB": "GBP", "US": "USD", "AU": "AUD",
        "SG": "SGD", "AE": "AED", "CA": "CAD", "JP": "JPY",
        "ZA": "ZAR", "DE": "EUR", "FR": "EUR", "NL": "EUR",
        "ES": "EUR", "IT": "EUR",
    }
    return mapping.get(country, "USD")


def analyze_and_create_session(property_input: PropertyInput) -> PricingResult:
    prop_dict = property_input.model_dump()
    session_id = session_store.create_session(prop_dict)

    lat = prop_dict.get("latitude")
    lon = prop_dict.get("longitude")
    currency = _get_currency(prop_dict)

    if lat is not None and lon is not None:
        # Real GPS path — generate comparables from actual location
        area_signals = _get_area_signals(lat, lon)
        location_factors = _derive_location_factors(lat, lon, area_signals)
        comparables = get_geo_comparables(
            prop_dict,
            lat=lat,
            lon=lon,
            currency=currency,
            removed_ids=set(),
            weight_overrides={},
        )
    else:
        # Fallback to mock London dataset
        location_factors = get_location_factors(prop_dict["zip_code"])
        comparables = get_comparables(prop_dict, removed_ids=set(), weight_overrides={})
        currency = _get_currency(prop_dict) or "GBP"

    claude_result = claude_service.analyze_property(
        prop_dict, comparables, location_factors, currency=currency
    )

    return PricingResult(
        session_id=session_id,
        recommended_price=claude_result["recommended_price"],
        price_range_low=claude_result["price_range_low"],
        price_range_high=claude_result["price_range_high"],
        confidence_score=claude_result["confidence_score"],
        reasoning=claude_result["reasoning"],
        comparables=comparables,
        removed_comparables=[],
        location_factors=location_factors,
        currency=currency,
    )


def recalculate_for_session(session_id: str) -> PricingResult:
    session = session_store.get_session(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    prop_dict = session["property_input"]
    lat = prop_dict.get("latitude")
    lon = prop_dict.get("longitude")
    currency = _get_currency(prop_dict)

    if lat is not None and lon is not None:
        area_signals = _get_area_signals(lat, lon)
        location_factors = _derive_location_factors(lat, lon, area_signals)
        comparables = get_geo_comparables(
            prop_dict,
            lat=lat,
            lon=lon,
            currency=currency,
            removed_ids=session["removed_ids"],
            weight_overrides=session["weight_overrides"],
        )
    else:
        location_factors = get_location_factors(prop_dict["zip_code"])
        comparables = get_comparables(
            prop_dict,
            removed_ids=session["removed_ids"],
            weight_overrides=session["weight_overrides"],
        )

    claude_result = claude_service.analyze_property(
        prop_dict, comparables, location_factors, currency=currency
    )

    return PricingResult(
        session_id=session_id,
        recommended_price=claude_result["recommended_price"],
        price_range_low=claude_result["price_range_low"],
        price_range_high=claude_result["price_range_high"],
        confidence_score=claude_result["confidence_score"],
        reasoning=claude_result["reasoning"],
        comparables=comparables,
        removed_comparables=list(session["removed_ids"]),
        location_factors=location_factors,
        currency=currency,
    )
