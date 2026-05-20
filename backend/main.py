import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pricing, comparables, feedback
from store.session_store import get_learnings_log

app = FastAPI(title="AI Rental Pricing Tool", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pricing.router)
app.include_router(comparables.router)
app.include_router(feedback.router)


@app.get("/api/health")
async def health():
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    return {
        "status": "ok",
        "model": "claude-opus-4-6",
        "api_key_set": bool(api_key),
    }


@app.get("/api/admin/learnings")
async def get_learnings():
    return {"learnings": get_learnings_log()}
