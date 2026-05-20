from fastapi import APIRouter, HTTPException
from models.property import PropertyInput
from models.pricing import PricingResult
from services import pricing_service
from store import session_store

router = APIRouter(prefix="/api/pricing", tags=["pricing"])


@router.post("/analyze", response_model=PricingResult)
async def analyze_property(property_input: PropertyInput):
    try:
        return pricing_service.analyze_and_create_session(property_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}", response_model=PricingResult)
async def get_session_pricing(session_id: str):
    try:
        return pricing_service.recalculate_for_session(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
