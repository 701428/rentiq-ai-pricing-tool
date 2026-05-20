"""All Claude AI interactions for the pricing tool."""
import json
import os
import re
from typing import List, Optional
import anthropic
from models.pricing import ComparableProperty, LocationFactors

_client: Optional[anthropic.Anthropic] = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _extract_json(text: str) -> dict:
    """Extract JSON from Claude's response, handling markdown code blocks."""
    # Try to find JSON in code blocks first
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    # Try raw JSON
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"No JSON found in response: {text[:500]}")


def analyze_property(
    property_input: dict,
    comparables: List[ComparableProperty],
    location_factors: LocationFactors,
    currency: str = "GBP",
) -> dict:
    """Call Claude to produce initial price recommendation."""
    comp_dicts = []
    for c in comparables:
        comp_dicts.append({
            "id": c.id,
            "address": c.address,
            "bedrooms": c.bedrooms,
            "bathrooms": c.bathrooms,
            "square_feet": c.square_feet,
            "listed_price": c.listed_price,
            "days_on_market": c.days_on_market,
            "similarity_score": c.similarity_score,
            "weight": c.weight,
            "location_factors": c.location_factors.model_dump(),
        })

    system = f"""You are a senior real estate rental pricing analyst with global expertise.
You receive a subject property and comparable rental listings enriched with location quality signals.
The local currency is {currency}. All prices must be in {currency} (monthly rent).
Analyse the data and return ONLY valid JSON (no other text) with these exact keys:
- recommended_price: integer (monthly {currency} rent)
- price_range_low: integer
- price_range_high: integer
- confidence_score: float between 0.0 and 1.0
- reasoning: string, 2-3 sentences explaining key factors driving the price, mentioning the city/area

Consider location factors carefully:
- School rating A > B > C > D > F adds premium
- Quiet noise level adds premium vs loud
- High flood risk discounts price
- High walkability score and more shops/parks add premium
- Weight field on each comparable scales its influence
- Lower confidence when fewer than 3 comparables or high variance in prices
- Use realistic local market rates for the city/country in {currency}"""

    user = f"""Subject property:
{json.dumps(property_input, indent=2)}

Subject location factors:
{json.dumps(location_factors.model_dump(), indent=2)}

Comparable properties ({len(comp_dicts)} found):
{json.dumps(comp_dicts, indent=2)}

Return the JSON price recommendation now."""

    message = get_client().messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return _extract_json(message.content[0].text)


def process_feedback(
    feedback_text: str,
    comparables: List[ComparableProperty],
    session_data: dict,
) -> dict:
    """Parse natural language feedback into structured adjustments."""
    comp_summary = []
    for c in comparables:
        comp_summary.append({
            "id": c.id,
            "address": c.address,
            "noise_level": c.location_factors.noise_level,
            "school_rating": c.location_factors.school_rating,
            "flood_risk": c.location_factors.flood_risk,
            "walkability_score": c.location_factors.walkability_score,
            "listed_price": c.listed_price,
            "days_on_market": c.days_on_market,
        })

    system = """You are a real estate pricing assistant. A pricing analyst is giving feedback on rental comparables.
Parse their natural language feedback into structured adjustments.
Return ONLY valid JSON (no other text) with these exact keys:
- acknowledgment: string, 1 friendly sentence acknowledging the feedback
- adjustments: array of objects, each with:
  - action: one of "remove_comparable" | "adjust_weight" | "note_factor" | "update_learned_weight"
  - comparable_ids: array of comparable IDs to act on (use [] for general notes)
  - factor: optional string (e.g. "noise_level", "school_rating", "flood_risk", "walkability_score")
  - direction: optional "increase" | "decrease" (for weight adjustments)
  - weight_value: optional float (specific weight to apply, between 0.1 and 2.0)
  - note: optional string for free-text learnings to store
  - reasoning: string explaining this adjustment

Interpret vague language carefully:
- "noisy" / "busy road" / "traffic" -> noise_level = loud -> action: remove_comparable for loud ones
- "bad schools" / "poor school" -> school_rating D or F -> action: remove_comparable
- "flood" / "flood risk" -> flood_risk medium/high -> action: remove_comparable
- "up and coming" / "improving area" -> note_factor with upward sentiment
- "too expensive" -> note_factor about price sensitivity
- "weight this more" / "prioritise" -> adjust_weight with direction: increase"""

    user = f"""Available comparables:
{json.dumps(comp_summary, indent=2)}

Previous learned weights: {json.dumps(session_data.get('learned_weights', {}), indent=2)}

User feedback: "{feedback_text}"

Parse this feedback into structured adjustments now."""

    message = get_client().messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return _extract_json(message.content[0].text)
