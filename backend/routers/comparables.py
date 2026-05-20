from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.pricing import PricingResult
from services import pricing_service
from store import session_store

router = APIRouter(prefix="/api/comparables", tags=["comparables"])


class RemoveRequest(BaseModel):
    session_id: str
    comparable_id: str


class AdjustWeightRequest(BaseModel):
    session_id: str
    comparable_id: str
    weight: float


class RestoreRequest(BaseModel):
    session_id: str
    comparable_id: str


@router.post("/remove", response_model=PricingResult)
async def remove_comparable(req: RemoveRequest):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session_store.remove_comparable(req.session_id, req.comparable_id)
    try:
        return pricing_service.recalculate_for_session(req.session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restore", response_model=PricingResult)
async def restore_comparable(req: RestoreRequest):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session_store.restore_comparable(req.session_id, req.comparable_id)
    try:
        return pricing_service.recalculate_for_session(req.session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adjust-weight", response_model=PricingResult)
async def adjust_weight(req: AdjustWeightRequest):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not (0.1 <= req.weight <= 2.0):
        raise HTTPException(status_code=400, detail="Weight must be between 0.1 and 2.0")
    session_store.set_comparable_weight(req.session_id, req.comparable_id, req.weight)
    try:
        return pricing_service.recalculate_for_session(req.session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
