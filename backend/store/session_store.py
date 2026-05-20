"""In-memory session store for the prototype."""
from typing import Dict, Any, List
import uuid

# session_id -> session data
_sessions: Dict[str, Dict[str, Any]] = {}

# Global learnings log (persists across all sessions)
_learnings_log: List[Dict[str, Any]] = []


def create_session(property_input: dict) -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "session_id": session_id,
        "property_input": property_input,
        "removed_ids": set(),
        "weight_overrides": {},  # comparable_id -> float weight
        "feedback_history": [],
        "learned_weights": {
            "school_weight": 1.0,
            "noise_weight": 1.0,
            "flood_weight": 1.0,
            "walkability_weight": 1.0,
        },
        "override_notes": [],
    }
    return session_id


def get_session(session_id: str) -> Dict[str, Any] | None:
    return _sessions.get(session_id)


def update_session(session_id: str, updates: dict):
    if session_id in _sessions:
        _sessions[session_id].update(updates)


def remove_comparable(session_id: str, comparable_id: str):
    if session_id in _sessions:
        _sessions[session_id]["removed_ids"].add(comparable_id)


def restore_comparable(session_id: str, comparable_id: str):
    if session_id in _sessions:
        _sessions[session_id]["removed_ids"].discard(comparable_id)


def set_comparable_weight(session_id: str, comparable_id: str, weight: float):
    if session_id in _sessions:
        _sessions[session_id]["weight_overrides"][comparable_id] = weight


def add_feedback_entry(session_id: str, entry: dict):
    if session_id in _sessions:
        _sessions[session_id]["feedback_history"].append(entry)


def add_override_note(session_id: str, note: str):
    if session_id in _sessions:
        _sessions[session_id]["override_notes"].append(note)
        _learnings_log.append({"session_id": session_id, "note": note})


def update_learned_weights(session_id: str, weight_updates: dict):
    if session_id in _sessions:
        for k, v in weight_updates.items():
            if k in _sessions[session_id]["learned_weights"]:
                _sessions[session_id]["learned_weights"][k] = v


def get_learnings_log() -> List[Dict[str, Any]]:
    return _learnings_log
