import os, io, requests
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

from datetime import datetime
from .firestore_db import db

from .schemas import LeaseExtract, CreateEventsRequest, GmailDraftRequest
from .firestore_db import save_lease
from .rules import compute_flags
from .ics_utils import rent_recurring_ics, renewal_window_ics
from googleapiclient.errors import HttpError
from app.schemas import CreateEventsRequest, GmailDraftRequest
from app.google_integrations import (
    calendar_service, gmail_service,
    create_rent_event, create_renewal_markers, create_gmail_draft
)
from app.parser_gemini import parse_lease_bytes
from app.mappers import map_zach_to_leaseextract

load_dotenv()

app = Flask(__name__)
origins = [o.strip() for o in os.getenv("CORS_ORIGINS","").split(",") if o.strip()]
CORS(app, origins=origins or "*")

@app.get("/")
def index():
    return {"ok": True, "service": "Lease/FounderOps Copilot API", "endpoints": ["/health", "/api/leases/save", "/api/google/events", "/api/google/gmail/draft", "/api/ics/rent", "/api/ics/renewal"]}

@app.get("/health")
def health():
    return {"ok": True}

# --- Option A: No Storage; proxy to Zach's parser (optional) -----------------
# Frontend sends the file; backend forwards to Zach; returns parsed JSON (+ save)
@app.post("/api/parse")
def parse_and_save():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    f = request.files["file"]
    raw = f.read()
    mime = f.mimetype or "application/pdf"

    # 1) Gemini → flat (Zach-style)
    try:
        flat = parse_lease_bytes(raw, mime)
    except Exception as e:
        return jsonify({"error": "gemini_failed", "detail": str(e)}), 500

    # 2) Map → your LeaseExtract schema
    data = map_zach_to_leaseextract(flat)

    # 3) Validate + compute flags + save
    try:
        le = LeaseExtract.model_validate(data)
    except Exception as e:
        return jsonify({"error":"Invalid payload from parser","detail":str(e),"raw":flat}), 400

    as_dict = le.model_dump()
    as_dict["red_flags"] = compute_flags(as_dict)
    user_id = request.form.get("user_id", "demo")
    saved_doc = save_lease(user_id, as_dict)

    return jsonify({"parsed": as_dict, "saved": True, "doc": saved_doc})

# --- Save parsed JSON directly (if Zach calls you) ---------------------------
@app.post("/api/leases/save")
def save_parsed_lease():
    data = request.get_json(force=True)
    # Validate / coerce minimal shape
    try:
        le = LeaseExtract.model_validate(data)
    except Exception as e:
        return jsonify({"error": "Invalid payload", "detail": str(e)}), 400

    as_dict = le.model_dump()
    as_dict["red_flags"] = compute_flags(as_dict)

    user_id = request.args.get("user_id", "demo-user")
    saved_doc = save_lease(user_id, as_dict)
    return jsonify({"saved": True, "lease": saved_doc})

# --- Google Calendar events ---------------------------------------------------
@app.post("/api/google/events")
def google_events():
    # Validate body
    try:
        body = request.get_json(force=True)
        req = CreateEventsRequest.model_validate(body)
    except Exception as e:
        return jsonify({"ok": False, "error": "bad_request", "detail": str(e)}), 400

    # Call Google Calendar with FE access token
    try:
        cal = calendar_service(req.access_token)
        created = {}

        if req.rent_first_due_iso:
            created["rent"] = create_rent_event(cal, req.calendar_id, req.rent_first_due_iso)

        if req.renewal_start_date and req.renewal_end_date:
            create_renewal_markers(cal, req.calendar_id, req.renewal_start_date, req.renewal_end_date)
            created["renewal"] = True

        return jsonify({"ok": True, "created": created}), 200

    except HttpError as e:
        status = getattr(getattr(e, "resp", None), "status", 401)
        return jsonify({
            "ok": False,
            "error": "google_api_error",
            "status": status,
            "message": str(e)
        }), status
    except Exception as e:
        return jsonify({"ok": False, "error": "server_error", "message": str(e)}), 500

# --- Gmail Draft --------------------------------------------------------------
@app.post("/api/google/gmail/draft")
def gmail_draft():
    # Validate body
    try:
        body = request.get_json(force=True)
        req = GmailDraftRequest.model_validate(body)
    except Exception as e:
        return jsonify({"ok": False, "error": "bad_request", "detail": str(e)}), 400

    # Call Gmail with FE access token
    try:
        gmail = gmail_service(req.access_token)
        draft = create_gmail_draft(gmail, req.to, req.subject, req.body)
        return jsonify({"ok": True, "draft_id": draft.get("id")}), 200

    except HttpError as e:
        status = getattr(getattr(e, "resp", None), "status", 401)
        return jsonify({
            "ok": False,
            "error": "google_api_error",
            "status": status,
            "message": str(e)
        }), status
    except Exception as e:
        return jsonify({"ok": False, "error": "server_error", "message": str(e)}), 500

# --- ICS fallbacks (no OAuth on stage? Download .ics) -------------------------
@app.get("/api/ics/rent")
def ics_rent():
    first_due_iso = request.args.get("first_due_iso")
    if not first_due_iso:
        return jsonify({"error": "first_due_iso query param required"}), 400
    ics = rent_recurring_ics(first_due_iso)
    return Response(ics, mimetype="text/calendar",
                    headers={"Content-Disposition": 'attachment; filename="rent.ics"'})

@app.get("/api/ics/renewal")
def ics_renewal():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    if not (start_date and end_date):
        return jsonify({"error": "start_date and end_date required"}), 400
    ics = renewal_window_ics(start_date, end_date)
    return Response(ics, mimetype="text/calendar",
                    headers={"Content-Disposition": 'attachment; filename="renewal.ics"'})

@app.post("/dev/firestore/ping")
def firestore_ping():
    doc = {"ping": True, "ts": datetime.utcnow().isoformat()}
    db.collection("le_test").add(doc)
    return {"ok": True, "wrote": doc}
    