"""Service to find and filter comparable properties."""
import math
from typing import List, Set
from data.mock_properties import MOCK_PROPERTIES
from models.pricing import ComparableProperty, LocationFactors


def _sqft_similarity(subject: int, comp: int) -> float:
    diff_pct = abs(subject - comp) / max(subject, comp)
    return max(0.0, 1.0 - diff_pct * 2)


def _compute_similarity(subject: dict, comp: dict) -> float:
    score = 0.0
    # Bedrooms: exact match = 0.4
    if comp["bedrooms"] == subject["bedrooms"]:
        score += 0.4
    elif abs(comp["bedrooms"] - subject["bedrooms"]) == 1:
        score += 0.2

    # Sqft: proportional 0-0.3
    score += _sqft_similarity(subject["square_feet"], comp["square_feet"]) * 0.3

    # Property type: 0.15
    if comp["property_type"] == subject.get("property_type", "apartment"):
        score += 0.15

    # Bathrooms: 0.15
    if comp["bathrooms"] == subject.get("bathrooms", 1.0):
        score += 0.15

    return round(min(score, 1.0), 3)


def _location_distance(subject_zip: str, comp_zip: str) -> float:
    """Approximate distance by zip code prefix similarity.
    For non-London postcodes (unknown area), return a moderate distance
    so all mock comparables are still surfaced ranked by property similarity.
    """
    s = subject_zip.upper().strip()
    c = comp_zip.upper().strip()
    if s == c:
        return 0.3
    if s[:2] == c[:2]:
        return 0.8
    if s[0] == c[0]:
        return 1.5
    # Unknown / different region — return a flat moderate distance so
    # comparables are still found and ranked by property similarity instead
    return 2.5


def get_comparables(
    subject: dict,
    removed_ids: Set[str],
    weight_overrides: dict,
    max_results: int = 6,
) -> List[ComparableProperty]:
    candidates = []
    for prop in MOCK_PROPERTIES:
        if prop["id"] == subject.get("id"):
            continue
        # Filter: same or adjacent bedroom count
        if abs(prop["bedrooms"] - subject["bedrooms"]) > 1:
            continue
        # Filter: sqft within 30%
        sqft_diff = abs(prop["square_feet"] - subject["square_feet"]) / max(subject["square_feet"], 1)
        if sqft_diff > 0.35:
            continue

        sim = _compute_similarity(subject, prop)
        dist = _location_distance(subject["zip_code"], prop["zip_code"])
        candidates.append((sim, dist, prop))

    # Sort by similarity desc, then distance asc
    candidates.sort(key=lambda x: (-x[0], x[1]))
    results = []
    for sim, dist, prop in candidates[:max_results + len(removed_ids)]:
        if prop["id"] in removed_ids:
            continue
        if len(results) >= max_results:
            break
        weight = weight_overrides.get(prop["id"], 1.0)
        lf = prop["location_factors"]
        results.append(
            ComparableProperty(
                id=prop["id"],
                address=prop["address"],
                distance_km=round(dist, 2),
                bedrooms=prop["bedrooms"],
                bathrooms=prop["bathrooms"],
                square_feet=prop["square_feet"],
                listed_price=prop["listed_price"],
                days_on_market=prop["days_on_market"],
                location_factors=LocationFactors(**lf),
                similarity_score=sim,
                weight=weight,
            )
        )
    return results
