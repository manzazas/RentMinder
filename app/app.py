import os, io, requests
from flask import Flask, request, jsonify, Response, send_from_directory
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
    create_rent_event, create_renewal_markers, create_gmail_draft, setup_email_reminders
)
from app.parser_gemini import parse_lease_bytes
from app.mappers import map_zach_to_leaseextract

load_dotenv()

app = Flask(__name__)
origins = [o.strip() for o in os.getenv("CORS_ORIGINS","").split(",") if o.strip()]
CORS(app, origins=origins or "*")

@app.after_request
def after_request(response):
    # Add CSP headers to allow Google APIs and OAuth
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
        "https://apis.google.com https://accounts.google.com "
        "https://cdn.jsdelivr.net https://www.gstatic.com; "
        "style-src 'self' 'unsafe-inline' "
        "https://cdn.jsdelivr.net https://accounts.google.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://accounts.google.com https://www.googleapis.com "
        "https://securetoken.googleapis.com https://apis.google.com https://cdn.jsdelivr.net; "
        "frame-src 'self' https://accounts.google.com https://content.googleapis.com; "
        "font-src 'self' https://cdn.jsdelivr.net;"
    )
    response.headers['Content-Security-Policy'] = csp
    return response

@app.get("/")
def index():
    return send_from_directory('..', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('..', filename)

@app.get("/api")
def api_info():
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
        email_reminders_setup = False

        # Create calendar events
        if req.rent_first_due_iso:
            created["rent"] = create_rent_event(cal, req.calendar_id, req.rent_first_due_iso)

        if req.renewal_start_date and req.renewal_end_date:
            create_renewal_markers(cal, req.calendar_id, req.renewal_start_date, req.renewal_end_date)
            created["renewal"] = True

        # Set up email reminders if requested
        if req.setup_email_reminders and req.rent_first_due_iso:
            gmail = gmail_service(req.access_token)
            email_result = setup_email_reminders(
                gmail, 
                req.rent_first_due_iso, 
                req.landlord_email,
                req.user_email
            )
            email_reminders_setup = email_result.get("setup", False)
            
            # Add email info to response
            if email_result.get("setup"):
                created["email_reminder"] = {
                    "draft_created": email_result.get("draft", {}).get("created", False),
                    "draft_id": email_result.get("draft", {}).get("draft_id"),
                    "confirmation_sent": email_result.get("confirmation", {}).get("sent", False),
                    "confirmation_to": email_result.get("confirmation", {}).get("to")
                }

        return jsonify({
            "ok": True, 
            "created": created,
            "email_reminders_setup": email_reminders_setup
        }), 200

    except HttpError as e:
        status = getattr(getattr(e, "resp", None), "status", 401)
        error_details = {
            "ok": False,
            "error": "google_api_error", 
            "status": status,
            "message": str(e)
        }
        print(f"Google API Error: {e}")  # Debug log
        print(f"Error status: {status}")  # Debug log
        return jsonify(error_details), status
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
    