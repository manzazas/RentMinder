# RentMinder — Backend (Flask) · `testing-main`

`testing-main` is our **integration branch** where the end-to-end flow is validated with the frontend before promoting to `main`.  
This Flask service handles **Upload → Gemini lease parsing → Firestore save**, plus **Google Calendar/Gmail** integrations and **ICS** fallbacks.

---

## Stack

- **Python 3 / Flask**
- **Google Generative AI (Gemini)** via `google-generativeai`
- **Firebase Admin SDK** (Firestore)
- **Google Calendar & Gmail** via user OAuth access tokens
- **CORS** for local dev

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

How it works internally:

- app/parser_gemini.py (Gemini → flat JSON) → app/mappers.py (flat → schema) → app/rules.py (red flags) → app/firestore_db.py (save to Firestore).

Default model may be set inside parser_gemini.py (e.g., gemini-2.5-flash).
If needed, change it there or wire an env override in that module.

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

## Google Integrations

Requires a Google OAuth access token from the frontend (Google Identity Services).

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
print(genai.GenerativeModel("gemini-2.5-flash").generate_content("ok").text)
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