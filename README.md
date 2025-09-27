# Lease/FounderOps Copilot – Backend (Flask)

## Setup
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit with your absolute serviceAccount path

## Run
export FLASK_APP=app.app:app
export FLASK_DEBUG=1
python -m flask run --port 8000

## Health
GET /health

## Save parsed lease (JSON)
POST /api/leases/save?user_id=demo
Body:
{"rent":{"amount":2000,"due_day":1},"deposit":{"amount":4000},"renewal":{},"repairs":{}}

## Google integrations
POST /api/google/events
POST /api/google/gmail/draft
# FE must send a Google OAuth access_token with scopes:
#  - https://www.googleapis.com/auth/calendar.events
#  - https://www.googleapis.com/auth/gmail.compose

## ICS fallbacks (no OAuth)
GET /api/ics/rent?first_due_iso=2025-10-01T09:00:00-04:00
GET /api/ics/renewal?start_date=2025-09-01&end_date=2025-09-15
