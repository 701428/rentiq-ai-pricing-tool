from pydantic import BaseModel
from typing import List, Optional, Any
from .pricing import PricingResult


class FeedbackSubmission(BaseModel):
    session_id: str
    feedback_text: str


class ParsedAdjustment(BaseModel):
    action: str
    comparable_ids: List[str] = []
    factor: Optional[str] = None
    direction: Optional[str] = None
    reasoning: str = ""


class FeedbackResult(BaseModel):
    acknowledgment: str
    adjustments_applied: List[ParsedAdjustment]
    updated_pricing: PricingResult


class FeedbackEntry(BaseModel):
    timestamp: str
    user_text: str
    acknowledgment: str
    adjustments: List[ParsedAdjustment]
