from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dateutil.parser import isoparse
from datetime import timedelta

def calendar_service(access_token: str):
    creds = Credentials(token=access_token)
    return build("calendar", "v3", credentials=creds, cache_discovery=False)

def gmail_service(access_token: str):
    creds = Credentials(token=access_token)
    return build("gmail", "v1", credentials=creds, cache_discovery=False)

def create_rent_event(cal, calendar_id: str, first_due_iso: str):
    start = first_due_iso
    end = (isoparse(first_due_iso) + timedelta(hours=1)).isoformat()
    body = {
        "summary": "Rent due",
        "start": {"dateTime": start},
        "end": {"dateTime": end},
        "recurrence": ["RRULE:FREQ=MONTHLY;INTERVAL=1"],
        "reminders": {"useDefault": False, "overrides": [
            {"method": "popup", "minutes": 2 * 24 * 60},  # 2 days
            {"method": "popup", "minutes": 9 * 60},       # 9AM same-day
        ]}
    }
    return cal.events().insert(calendarId=calendar_id, body=body).execute()

def create_renewal_markers(cal, calendar_id: str, start_date: str, end_date: str):
    e1 = {"summary": "Renewal window starts", "start": {"date": start_date}, "end": {"date": start_date}}
    e2 = {"summary": "Renewal window ends",   "start": {"date": end_date},   "end": {"date": end_date}}
    cal.events().insert(calendarId=calendar_id, body=e1).execute()
    cal.events().insert(calendarId=calendar_id, body=e2).execute()
    return True

def create_gmail_draft(gmail, to: str, subject: str, body: str):
    import base64
    raw = f"To: {to}\r\nSubject: {subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n{body}"
    encoded = base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8")
    return gmail.users().drafts().create(userId="me", body={"message": {"raw": encoded}}).execute()
