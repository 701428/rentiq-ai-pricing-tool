# AI-Powered Rental Pricing Tool — Approach Document

## Executive Summary

RentIQ is an AI-assisted rental pricing solution that helps property pricing teams move beyond rule-based, comparable-only pricing. By combining structured property data, historical rental data, and rich location intelligence—school ratings, flood risk, noise levels, walkability, parks, and local amenities—with a Claude-powered reasoning engine, RentIQ recommends optimal rental prices and explains its reasoning in plain English. Pricing analysts can interactively refine recommendations through natural language feedback, and every interaction feeds a learning loop for continuous improvement.

---

## Problem Statement

| Today's Pain                          | Impact                                         |
|---------------------------------------|------------------------------------------------|
| Fixed rules & simple comp matching    | Misses local quality signals (schools, noise)  |
| No flood / environmental risk weighting | Over-prices risky properties                  |
| Analysts manually adjust every listing | Slow, inconsistent, knowledge locked in heads |
| No feedback loop                      | Pricing team learnings not captured or reused  |

---

## Proposed Solution: RentIQ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   PRICING ANALYST                    │
│  Inputs property → Views recommendation → Gives     │
│  feedback in natural language → Accepts final price  │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   React Frontend    │
        │  (RentIQ Web App)   │
        └──────────┬──────────┘
                   │ REST API
        ┌──────────▼──────────┐
        │   FastAPI Backend   │
        │                     │
        │  ┌───────────────┐  │
        │  │ Comparables   │  │◄──── Property Database (CRM/PMS)
        │  │ Service       │  │
        │  └───────┬───────┘  │
        │          │          │
        │  ┌───────▼───────┐  │
        │  │ Location      │  │◄──── External APIs:
        │  │ Enrichment    │  │      - School ratings (Ofsted)
        │  └───────┬───────┘  │      - Flood risk (Environment Agency)
        │          │          │      - Noise maps (OS/local authority)
        │  ┌───────▼───────┐  │      - POI data (Google Places/OS)
        │  │ Claude AI     │  │
        │  │ Pricing Engine│  │
        │  └───────┬───────┘  │
        │          │          │
        │  ┌───────▼───────┐  │
        │  │ Session Store │  │
        │  │ + Learnings   │  │
        │  └───────────────┘  │
        └─────────────────────┘
```

---

## User Journey

### Step 1: Property Input
The analyst enters the property address, bedrooms, bathrooms, square footage, type, furnishing status, and amenities. For the full production system, this form would be pre-populated from the company's Property Management System (PMS).

### Step 2: AI Analysis
The system:
1. Derives location factors for the postcode (school rating, noise, flood risk, parks, walkability, shops)
2. Finds the 6 most comparable properties from the database (filtered by bed/bath/sqft similarity and proximity)
3. Enriches comparables with their own location factors
4. Sends all data to Claude with a structured prompt
5. Claude returns: recommended price, price range, confidence score (0–1), and plain-English reasoning

### Step 3: Analyst Review
The analyst sees:
- **Recommended price** with range (e.g., £2,700 – £2,950/mo)
- **Confidence badge** (green/yellow/red based on number and quality of comparables)
- **AI reasoning** panel explaining the key factors
- **Comparable cards** each showing address, price, distance, and location factor chips
- **Subject property location factors** shown in a visual grid

### Step 4: Manual Adjustments
For each comparable property the analyst can:
- **Remove it** from the analysis (price recalculates immediately)
- **Adjust its weight** (0.1× to 2.0×) using a slider
Both actions trigger an instant AI re-analysis.

### Step 5: Natural Language Feedback
The analyst types free-form feedback like:
- *"Remove the properties near busy roads"*
- *"This area has better schools than the comps suggest"*
- *"The neighbourhood is gentrifying, adjust upward"*
- *"Ignore anything with medium or high flood risk"*

Claude parses this into structured actions (remove, reweight, note) and returns an acknowledgment. The price updates in real time.

### Step 6: Accept & Submit
The analyst accepts the final recommended price. All feedback and learned adjustments are stored in the learnings log for future model improvement.

---

## Data Sources

| Data Type             | Source (Production)                          | Prototype |
|-----------------------|----------------------------------------------|-----------|
| Property listings     | Internal PMS / CRM                           | 30 mock London properties |
| Historical rentals    | Internal transaction database                | Mock listed_price + days_on_market |
| School ratings        | Ofsted API / UPRN lookup                     | Hardcoded by postcode |
| Flood risk            | Environment Agency Flood Map API             | Hardcoded by postcode |
| Noise levels          | OS MasterMap Highways / DEFRA noise maps     | Hardcoded by postcode |
| Parks & green spaces  | Ordnance Survey Open Greenspace              | Hardcoded count by postcode |
| Walkability           | Walk Score API or custom POI computation     | Hardcoded by postcode |
| Shops / amenities     | Google Places API / OS Points of Interest   | Hardcoded count by postcode |
| AI reasoning          | Anthropic Claude (claude-opus-4-6)          | Live API call |

---

## AI Architecture: Claude's Three Roles

### Role 1: Pricing Analysis (Initial)
**When:** On property form submission
**Input:** Subject property + enriched comparables + location factors
**Output:** `{recommended_price, price_range_low, price_range_high, confidence_score, reasoning}`
**Prompt strategy:** Structured JSON input, explicit instructions on how each location factor should influence price, explicit confidence calibration rules

### Role 2: Feedback Interpretation
**When:** On every natural language feedback submission
**Input:** Free-text feedback + current comparables summary (with their location factors)
**Output:** `{acknowledgment, adjustments: [{action, comparable_ids, factor, direction}]}`
**Prompt strategy:** Teaches Claude the vocabulary of vague analyst language ("noisy", "flood risk", "up-and-coming") and maps it to typed actions on the comparable set

### Role 3: Re-Analysis (After Adjustments)
**When:** After any removal, weight change, or feedback
**Input:** Updated comparable set (post-removals, post-reweighting)
**Output:** Same structure as Role 1 with updated price
**Design:** Claude always re-analyzes from scratch with the current state — this ensures prices are always self-consistent and reasons are fresh

---

## Feedback Loop & Learning Architecture

```
User Feedback
     │
     ├── Structured adjustments (remove / reweight)
     │       └── Applied immediately to session state
     │
     └── Free-text notes (sentiment, local knowledge)
             └── Stored in learnings_log
                      │
                      ├── Short-term: Per-session weight adjustments
                      │   e.g., school_weight: 1.3 for this session
                      │
                      ├── Medium-term: Fine-tuning dataset
                      │   Collect (property, feedback, price_delta) pairs
                      │   → Use to fine-tune Claude or a lightweight regression model
                      │
                      └── Long-term: Automated location signal improvement
                          If "noisy" feedback consistently correlates with a
                          specific street type → update noise data source
```

### Learning Data Model
Each feedback event captures:
- The property being priced
- The natural language feedback
- Which adjustments were made
- The resulting price change (delta)
- Whether the analyst accepted the final price

This dataset enables:
1. **Prompt refinement** — improve Claude's pricing prompts based on systematic errors
2. **Location data correction** — identify where hardcoded signals are wrong
3. **Comparables algorithm tuning** — learn which similarity factors matter most
4. **Analyst pattern learning** — if analyst X always removes flood-risk properties, pre-filter for them

---

## Confidence Score Logic

| Condition                              | Impact on Confidence |
|----------------------------------------|---------------------|
| 5+ high-similarity comparables         | +high               |
| < 3 comparables remaining              | -significant        |
| High price variance across comps       | -moderate           |
| All comps in same postcode district    | +moderate           |
| Comp removed due to flood/noise        | -slight             |
| A-rated schools in subject area        | +slight (clarity)   |

Claude is explicitly instructed to lower confidence when data is sparse or inconsistent, making the badge genuinely useful for the analyst's decision.

---

## Technical Architecture

### Backend (Python / FastAPI)
- **`/api/pricing/analyze`** — Full analysis pipeline, creates session
- **`/api/comparables/remove`** — Remove comparable, recalculate
- **`/api/comparables/adjust-weight`** — Adjust weight, recalculate
- **`/api/feedback/submit`** — Parse NL feedback, apply, recalculate
- **`/api/feedback/history/{session_id}`** — Session feedback log
- **`/api/admin/learnings`** — Global learnings log

### Frontend (React + TypeScript + Tailwind)
- **PropertyForm** — Structured property input
- **PricingCard** — Recommended price with confidence, expandable reasoning
- **ComparableCard** — Individual comparable with remove/weight controls and location chips
- **LocationFactorsCard** — Visual grid of subject property location signals
- **FeedbackPanel** — Chat-style NL feedback with suggested prompts

### State Management
Session-based: Each analysis creates a `session_id`. All subsequent actions reference this ID. The backend maintains session state (removed IDs, weight overrides, feedback history, learned weights) in memory. In production this would be Redis or a lightweight DB.

---

## Production Considerations

| Concern                | Production Solution                                          |
|------------------------|--------------------------------------------------------------|
| API key security       | Backend-only Claude calls, no key in frontend               |
| Session persistence    | Redis or PostgreSQL session store                            |
| Real property data     | CRM/PMS integration via REST or GraphQL                      |
| Location data freshness| Scheduled ETL jobs pulling from OS, Environment Agency APIs |
| Claude cost            | Cache common postcode/property-type combinations            |
| Response latency       | Async streaming for Claude responses (show typing indicator) |
| Audit trail            | Full logging of every Claude call with input/output         |
| Access control         | Role-based: analysts vs admins vs read-only reviewers       |
| Feedback quality gate  | Human review of learnings before feeding back to model      |

---

## Prototype Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Lucide icons |
| Backend   | Python 3.12, FastAPI, Pydantic v2, Uvicorn |
| AI        | Anthropic Claude (claude-opus-4-6) via Python SDK |
| Data      | In-memory (30 mock London properties, hardcoded location factors) |
| State     | In-memory Python dict (session store) |

---

## Running the Prototype

```bash
# 1. Set your Anthropic API key
echo "ANTHROPIC_API_KEY=your_key_here" > backend/.env

# 2. Start both servers
./start.sh

# Or manually:
# Terminal 1 — Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** (or 5174 if 5173 is busy)

**API docs:** http://localhost:8000/docs

---

## What the Prototype Demonstrates

1. ✅ Property input form with all relevant fields
2. ✅ AI price recommendation with confidence score and plain-English reasoning
3. ✅ Comparable properties with full location factor chips (school/noise/flood/parks/walkability/shops)
4. ✅ Remove comparable → instant price recalculation
5. ✅ Adjust comparable weight → instant price recalculation
6. ✅ Natural language feedback panel with chat history
7. ✅ Suggested feedback prompts for common scenarios
8. ✅ AI-parsed feedback with acknowledged adjustments
9. ✅ Learnings log endpoint (`GET /api/admin/learnings`)
10. ✅ Session state preservation across all interactions
