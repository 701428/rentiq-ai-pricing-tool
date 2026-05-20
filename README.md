# RentIQ — AI-Powered Rental Pricing Tool

> Submission for: AI-assisted Rental Pricing Solution challenge

**Live Demo:** https://rentiq-ai-pricing-tool-j5sf-huokw99we.vercel.app/ | **API:** https://rentiq-backend.onrender.com | **Approach Deck:** https://701428.github.io/rentiq-ai-pricing-tool/

---

## What it does

RentIQ recommends optimal rental prices by combining:
- 📍 **Real GPS location** — detects your city, finds real nearby streets via OpenStreetMap
- 🏫 **6 location signals** — school rating, noise level, flood risk, parks, walkability, shops
- 🤖 **Claude AI reasoning** — explains the price in plain English with a confidence score
- 💬 **Natural language feedback** — type "remove noisy ones" → price updates instantly
- 🌍 **Global** — works for any city, auto-detects local currency (₹ INR, £ GBP, $ USD…)

---

## Running locally

### Prerequisites
- Python 3.12+
- Node 18+
- Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### Backend
```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
uvicorn main:app --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Architecture

```
Browser (React + Tailwind)
    │
    ▼ REST API
FastAPI Backend (Python 3.12)
    ├── Overpass API   → real nearby streets & amenity signals
    ├── Nominatim      → address autocomplete & reverse geocode
    └── Claude AI      → pricing analysis + NL feedback parsing
```

## Key API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/pricing/analyze` | Full AI analysis, creates session |
| POST | `/api/comparables/remove` | Remove comparable, recalculate |
| POST | `/api/comparables/adjust-weight` | Reweight comparable |
| POST | `/api/feedback/submit` | NL feedback → parsed actions → new price |
| GET  | `/api/admin/learnings` | All stored feedback learnings |
| GET  | `/api/docs` | Swagger UI |

---

## Approach Document

Open `APPROACH_DECK.html` in your browser for the full approach document covering:
- User journey (6 steps)
- Data sources table
- AI architecture & prompt design
- Feedback loop & learning strategy
- Prototype screenshots
- Production roadmap

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand, Vite |
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| AI | Anthropic Claude (claude-opus-4-6) |
| Location | OpenStreetMap (Overpass + Nominatim) — free, no key |
| Deployment | Vercel (frontend) + Render (backend) |
