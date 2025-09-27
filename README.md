# RentMinder — Backend (Flask) · `testing-backend`

This branch is a **working backend snapshot** used to integrate with the frontend before promoting to `testing-main` and `main`.  
It provides a single Flask service for **upload → Gemini parsing → Firestore save**, plus **Google Calendar/Gmail** integrations and **ICS** fallbacks.

---

## Tech Stack

- **Python 3 / Flask**
- **Google Generative AI (Gemini)** via `google-generativeai`
- **Firebase Admin SDK** (Firestore)
- **Google Calendar & Gmail** (via user OAuth access tokens)
- **CORS** enabled for local development

---

## Local Setup

```bash
# 1) Create & activate a virtual environment
python -m venv env && source env/bin/activate    # (or: .venv)

# 2) Install dependencies
pip install -r requirements.txt

# 3) Configure environment
cp .env.example .env
# then edit .env (see Env Vars below)

# 4) Run the server
export FLASK_APP=app.app:app
export FLASK_DEBUG=1
python -m flask run --port 8000
# → http://127.0.0.1:8000
```

---

## Required Env Vars (.env)

```dotenv
### Firebase Admin service account JSON (absolute path; quote if it has spaces)
GOOGLE_APPLICATION_CREDENTIALS="/ABSOLUTE/PATH/TO/secrets/service-account.json"

### Gemini (AI Studio API key)
GEMINI_API_KEY="YOUR_AI_STUDIO_KEY"

### Optional: override model (default works across projects)
GEMINI_MODEL="gemini-1.5-flash-8b"

### CORS for local frontends
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Health & Index

```bash
# list available endpoints
curl -s http://127.0.0.1:8000/ | jq .

# health check
curl -s http://127.0.0.1:8000/health
```

---

## Upload & Parse (Gemini) — Core Demo

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

---

### Response (200)

```json
{
  "parsed": { /* normalized nested lease object */ },
  "saved": true,
  "doc": { /* Firestore record */ }
}
```

Under the hood: app/parser_gemini.py (Gemini) → flat fields → app/mappers.py (nest to schema) → app/rules.py (red flags) → Firestore save.

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

## ICS Fallbacks (No OAuth)

GET /api/ics/rent?first_due_iso=2025-10-01T09:00:00-04:00
GET /api/ics/renewal?start_date=2026-04-01&end_date=2026-04-30

Returns downloadable .ics files that can be imported into calendar apps

---

## Security

- Never commit secrets: .env, service accounts, keys.
- Repo should ignore:
    - .env
    - env/
    - .venv/
    - secrets/
    - __pycache__/
    - *.pyc

---

## Troubleshooting

500 gemini_failed
Ensure .env has GEMINI_API_KEY and the model is available to your project:
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

- `GET /` — index (lists endpoints)  
- `GET /health` — service status  
- `POST /api/parse` — **upload → parse (Gemini) → save → return parsed**  
- `POST /api/leases/save` — save structured lease JSON  
- `POST /api/google/events` — create rent + renewal events  
- `POST /api/google/gmail/draft` — create maintenance email draft  
- `GET /api/ics/rent` — rent reminder ICS  
- `GET /api/ics/renewal` — renewal window ICS

---