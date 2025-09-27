# RentMinder — Main

A lightweight copilot for renters. Upload a lease (PDF/image) → we extract key terms with **Google Gemini**, flag potential issues, and help you **set calendar reminders** and **draft maintenance emails**—with citations back to the lease.

This is the **final (demo-ready)** branch.

---

## What it does

- **Lease parsing (Gemini)** — rent, deposit, term, due date, renewal window, repair SLA, landlord info.
- **Red flags** — simple NYC-oriented checks (missing renewal notice, no repair SLA, oversized deposit, ambiguous late fees, etc.).
- **Evidence** — short quotes + page numbers supporting extracted fields.
- **Calendar integration** — recurring “Rent due” + “Renewal window” markers.
- **Gmail draft** — one-click maintenance email draft referencing the relevant clause.
- **ICS fallbacks** — downloadable `.ics` files if OAuth isn’t available on demo day.

---

## Demo (2–3 minutes)

1. **Upload lease** → parsed cards appear with red flags and source quotes.  
2. **Create events** → show “Rent due” recurrence and “Renewal window” in Google Calendar.  
3. **Maintenance draft** → generate a Gmail draft that cites the lease clause & SLA.  
4. **Transparency** → show the supporting quotes (source notes).

> If OAuth is flaky, use the **ICS** buttons to download and open calendar entries.

---

## Tech Stack

- **Flask (Python 3)**
- **Google Generative AI (Gemini)** via `google-generativeai`
- **Firebase Admin SDK** (Firestore)
- **Google Calendar / Gmail APIs** (via user OAuth tokens from the frontend)
- ICS generation for offline calendar import

Directory highlights:

- app/
- app.py # Flask app + routes
- parser_gemini.py # Gemini call; returns flat JSON
- mappers.py # flat → nested schema (LeaseExtract)
- rules.py # red flag logic
- firestore_db.py # Firestore writes/reads
- ics_utils.py # calendar .ics helpers

---

## Local Setup

```bash
# 1) Create & activate a venv
python -m venv env && source env/bin/activate   # (or .venv)

# 2) Install deps
pip install -r requirements.txt

# 3) Env file
cp .env.example .env
# then edit .env (see below)

# 4) Run
export FLASK_APP=app.app:app
export FLASK_DEBUG=1
python -m flask run --port 8000
# → http://127.0.0.1:8000
```

---

## .env variables

```dotenv
# Firebase Admin service account (absolute path; quote if it has spaces)
GOOGLE_APPLICATION_CREDENTIALS="/ABSOLUTE/PATH/TO/serviceAccount.json"

# Gemini (AI Studio API key)
GEMINI_API_KEY="your_gemini_api_key_here"

# CORS for local frontends (adjust as needed)
CORS_ORIGINS="*"

# Legacy proxy to an external parser (unused by default)
# ZACH_PARSE_URL=http://localhost:9000/parse
```

---

## Health & Index

```bash
curl -s http://127.0.0.1:8000/ | jq .   # lists endpoints
curl -s http://127.0.0.1:8000/health    # "ok"
```

---

## Upload & Parse (Gemini) — Core Path

### Endpoint

```swift
POST /api/parse
multipart/form-data:
  - file    (PDF/JPG/PNG)
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

Under the hood: parser_gemini.py (Gemini → flat) → mappers.py (flat → schema) → rules.py (flags) → firestore_db.py (save).

---

## Save Structured Lease Directly (JSON)

```yaml
POST /api/leases/save?user_id=demo
Content-Type: application/json
{
  "rent": {"amount": 2000, "due_day": 1},
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

## Google Integrations (OAuth required)

Frontend supplies a Google OAuth access token (Google Identity Services).

### Create Calendar Events

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

Returns .ics files that can be opened/imported into calendar apps — a reliable demo path when OAuth isn’t available.

---

## Security 

- Never commit secrets: .env, service accounts, keys.
- Repo ignores should include:
    - .env
    - env/
    - .venv/
    - secrets/
    - __pycache__/
    - *.pyc

---

## Branching (integration flow)

- backend — active backend development
- testing-main — this branch (integrated staging before main)
- main — demo-ready
- archive/* — historical artifacts (e.g., old Node prototype), not used by Flask

Typical flow: feature branches → backend → testing-main → main

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

## Endpoint Index

- GET / — index (lists endpoints)
- GET /health — service status
- POST /api/parse — upload → parse (Gemini) → save → return parsed
- POST /api/leases/save — save structured lease JSON
- POST /api/google/events — create rent + renewal events
- POST /api/google/gmail/draft — create maintenance email draft
- GET /api/ics/rent — rent reminder ICS
- GET /api/ics/renewal — renewal window ICS
- POST /dev/firestore/ping — test write to Firestore (dev)

---

## Credits

- Backend: Flask, Firestore, ICS
- Parsing: Gemini (`parser_gemini.py`)
- Frontend: HTML/Bootstrap (upload UI + Google Identity Services)
- Team: Zachary Stybel, Ye Moe, Tamim Kabir

---