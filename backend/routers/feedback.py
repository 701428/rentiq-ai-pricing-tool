from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import List
from models.feedback import FeedbackSubmission, FeedbackResult, FeedbackEntry, ParsedAdjustment
from models.pricing import PricingResult
from services import pricing_service, claude_service
from services.comparables_service import get_comparables
from store import session_store

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("/submit", response_model=FeedbackResult)
async def submit_feedback(req: FeedbackSubmission):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get current comparables
    current_comparables = get_comparables(
        session["property_input"],
        removed_ids=session["removed_ids"],
        weight_overrides=session["weight_overrides"],
    )

    try:
        parsed = claude_service.process_feedback(
            req.feedback_text,
            current_comparables,
            session,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude error: {e}")

    adjustments_applied = []
    for adj in parsed.get("adjustments", []):
        action = adj.get("action", "")
        ids = adj.get("comparable_ids", [])
        pa = ParsedAdjustment(
            action=action,
            comparable_ids=ids,
            factor=adj.get("factor"),
            direction=adj.get("direction"),
            reasoning=adj.get("reasoning", ""),
        )
        adjustments_applied.append(pa)

        if action == "remove_comparable":
            for cid in ids:
                session_store.remove_comparable(req.session_id, cid)

        elif action == "adjust_weight":
            weight_val = adj.get("weight_value")
            if weight_val and ids:
                for cid in ids:
                    session_store.set_comparable_weight(req.session_id, cid, float(weight_val))
            elif adj.get("direction") == "increase" and ids:
                for cid in ids:
                    current_w = session["weight_overrides"].get(cid, 1.0)
                    session_store.set_comparable_weight(req.session_id, cid, min(current_w + 0.3, 2.0))
            elif adj.get("direction") == "decrease" and ids:
                for cid in ids:
                    current_w = session["weight_overrides"].get(cid, 1.0)
                    session_store.set_comparable_weight(req.session_id, cid, max(current_w - 0.3, 0.1))

        elif action == "update_learned_weight":
            factor = adj.get("factor")
            direction = adj.get("direction")
            if factor and direction:
                weight_key = f"{factor.replace('_level', '').replace('_rating', '').replace('_risk', '')}_weight"
                current = session["learned_weights"].get(weight_key, 1.0)
                delta = 0.2 if direction == "increase" else -0.2
                session_store.update_learned_weights(req.session_id, {weight_key: round(max(0.5, min(2.0, current + delta)), 2)})

        elif action == "note_factor":
            note = adj.get("note") or adj.get("reasoning", "")
            if note:
                session_store.add_override_note(req.session_id, note)

    # Re-calculate price with updated session
    updated_pricing = pricing_service.recalculate_for_session(req.session_id)

    # Store feedback entry
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_text": req.feedback_text,
        "acknowledgment": parsed.get("acknowledgment", ""),
        "adjustments": [a.model_dump() for a in adjustments_applied],
    }
    session_store.add_feedback_entry(req.session_id, entry)

    return FeedbackResult(
        acknowledgment=parsed.get("acknowledgment", "Got it, I've updated the analysis."),
        adjustments_applied=adjustments_applied,
        updated_pricing=updated_pricing,
    )


@router.get("/history/{session_id}", response_model=List[FeedbackEntry])
async def get_feedback_history(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [FeedbackEntry(**e) for e in session["feedback_history"]]
