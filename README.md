# RentMinder — Backend (Flask) · `backend`

This branch is the **active backend development** branch. It runs a single Flask service that powers:

- **Lease ingestion** (PDF / image) → **Gemini parsing** → **normalized schema** → **Firestore save**
- **Google Calendar** event creation (rent recurrence + renewal markers)
- **Gmail** draft generation for maintenance emails
- **ICS** fallbacks (no OAuth) for a reliable demo path

Use this branch for day-to-day backend work; integration happens on `testing-main` and demo on `main`.

---

## Stack

- **Python 3 / Flask**
- **Google Generative AI (Gemini)** via `google-generativeai`
- **Firebase Admin SDK** (Firestore)
- **Google Calendar / Gmail** via user OAuth access tokens (frontend supplies `access_token`)
- **CORS** enabled for local development

Directory highlights:

- app/
- app.py # Flask app + routes
- parser_gemini.py # Gemini call; returns flat JSON
- mappers.py # flat → nested LeaseExtract
- rules.py # red flag rules
- firestore_db.py # Firestore writes/reads
- ics_utils.py # ICS builders

---

## Local Setup

```bash
# 1) Create & activate a virtual environment
python -m venv env && source env/bin/activate     # (or: .venv)

# 2) Install dependencies
pip install -r requirements.txt

# 3) Configure environment
cp .env.example .env
# then edit .env (see below)

# 4) Run the server
export FLASK_APP=app.app:app
export FLASK_DEBUG=1
python -m flask run --port 8000
# → http://127.0.0.1:8000
```

---

## Required .env

```dotenv
# Firebase Admin service account (absolute path; quote if the path has spaces)
GOOGLE_APPLICATION_CREDENTIALS="/ABS/PATH/TO/secrets/service-account.json"

# Gemini (AI Studio API key)
GEMINI_API_KEY="YOUR_AI_STUDIO_KEY"

# Optional: model override (default is robust for most projects)
GEMINI_MODEL="gemini-1.5-flash-8b"

# CORS (add frontend origins for local dev)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Health & Index

```bash
curl -s http://127.0.0.1:8000/ | jq .   # endpoint index
curl -s http://127.0.0.1:8000/health    # "ok"
```

---

## Upload & Parse (Gemini) — Core Flow

### Endpoint

```swift
POST /api/parse
multipart/form-data:
  - file    (PDF/JPG/PNG lease)
  - user_id (string, optional; default "demo")
```

### Example

```bash
FILE="/absolute/path/NY_Mock_Rental.pdf"
curl -i \
  -F "file=@\"$FILE\"" \
  -F "user_id=demo" \
  http://127.0.0.1:8000/api/parse
```

### Response (200)

```json
{
  "parsed": { /* normalized nested lease object */ },
  "saved": true,
  "doc": { /* Firestore record */ }
}
```

Internals

parser_gemini.py (Gemini → flat JSON) → mappers.py (flat → nested schema) → rules.py (red flags) → firestore_db.py (save).

---

## Save Structured Lease Directly (JSON)

If the UI already has structured data (or for quick testing):

```yaml
POST /api/leases/save?user_id=demo
Content-Type: application/json
{
  "rent":    {"amount": 2000, "due_day": 1},
  "deposit": {"amount": 4000},
  "renewal": {},
  "repairs": {}
}
```

### Example

```bash
curl -i -X POST "http://127.0.0.1:8000/api/leases/save?user_id=demo" \
  -H "Content-Type: application/json" \
  -d '{"rent":{"amount":2000,"due_day":1},"deposit":{"amount":4000},"renewal":{},"repairs":{}}'
```

---

## Google Integrations

These require a Google OAuth access token from the frontend (GIS).

### Craete Calendar Events

```bash
POST /api/google/events
Content-Type: application/json
{
  "access_token": "ya29...",                // scope: https://www.googleapis.com/auth/calendar.events
  "calendar_id": "primary",
  "rent_first_due_iso": "2025-10-01T09:00:00-04:00",
  "renewal_start_date": "2026-04-01",
  "renewal_end_date": "2026-04-30"
}
```

### Create Gmail Draft

```bash
POST /api/google/gmail/draft
Content-Type: application/json
{
  "access_token": "ya29...",                // scope: https://www.googleapis.com/auth/gmail.compose
  "to": "landlord@example.com",
  "subject": "Maintenance request — Leaky sink",
  "body": "Hello ... (include clause/SLA reference)"
}
```

---

## ICS Fallbacks (no OAuth)

GET /api/ics/rent?first_due_iso=2025-10-01T09:00:00-04:00
GET /api/ics/renewal?start_date=2026-04-01&end_date=2026-04-30

Returns .ics files importable into any calendar app—useful for demos if OAuth isn’t available.

---

## Security

- Never commit secrets: .env, service accounts, tokens.
- .gitignore should include:
    - .env
    - env/
    - .venv/
    - secrets/
    - __pycache__/
    - *.pyc

---

## Development Notes (this branch)

- Canonical parser entry point: app/parser_gemini.py
    - Exports: parse_lease_bytes(file_bytes: bytes, mime_type: str) -> dict (flat)
    - Default model comes from GEMINI_MODEL or falls back to gemini-1.5-flash-8b
- Mapping contract: app/mappers.py maps flat → nested LeaseExtract schema
- Red flags: app/rules.py (keep messages concise and judge-friendly)
- Firestore collection: typically leases (see firestore_db.py)

---

## Troubleshooting

If `500 gemini_failed` 

Ensure GEMINI_API_KEY is set and your project has access to the chosen model.
You can sanity-check in Python:

```bash
python - <<'PY'
import os, google.generativeai as genai
from dotenv import load_dotenv; load_dotenv(".env", override=True)
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = os.getenv("GEMINI_MODEL","gemini-1.5-flash-8b")
print(genai.GenerativeModel(model).generate_content("ok").text)
PY
```

---

## Branch Workflow

- **backend** — you are here (active backend development)
- **testing-main** — integrated staging (merge here to validate with FE)
- **main** — demo-ready
- **archive/*** — historical artifacts (not used by Flask)

**Typical flow:** feature branches → `backend` → `testing-main` → `main`

---

## Endpoint Index

- `GET /` — index (lists endpoints)  
- `GET /health` — service status  
- `POST /api/parse` — **upload → parse (Gemini) → save → return parsed**  
- `POST /api/leases/save` — save structured lease JSON  
- `POST /api/google/events` — create rent + renewal events  
- `POST /api/google/gmail/draft` — create maintenance email draft  
- `GET /api/ics/rent` — rent reminder ICS  
- `GET /api/ics/renewal` — renewal window ICS

---