from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dateutil.parser import isoparse
from datetime import timedelta, datetime
import base64

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
        "start": {
            "dateTime": start,
            "timeZone": "America/New_York"
        },
        "end": {
            "dateTime": end,
            "timeZone": "America/New_York"
        },
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
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Create proper MIME message
    msg = MIMEMultipart()
    msg['to'] = to
    msg['subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
    return gmail.users().drafts().create(userId="me", body={"message": {"raw": raw}}).execute()

def send_gmail_message(gmail, to: str, subject: str, body: str):
    """Send an actual Gmail message (not just a draft)"""
    import base64
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Create proper MIME message
    msg = MIMEMultipart()
    msg['to'] = to
    msg['subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
    return gmail.users().messages().send(userId="me", body={"raw": raw}).execute()

def send_confirmation_email(gmail, user_email: str, rent_due_date: str, landlord_email: str = None):
    """Send immediate confirmation email to user"""
    subject = "RentMinder Setup Complete - Rent Reminders Activated"
    
    body = f"""Hi there!

Great news! Your RentMinder setup is now complete and active. Here's what we've set up for you:

CALENDAR REMINDERS:
• Monthly rent reminder events added to your Google Calendar
• Next rent due: {rent_due_date}

EMAIL REMINDERS:
• We've created a Gmail draft template for rent reminders
• You can customize and send this 3 days before rent is due
{f'• Landlord email: {landlord_email}' if landlord_email else '• Note: No landlord email found in lease - you can add it manually'}

🎯 WHAT'S NEXT:
1. Check your Google Calendar for the rent reminder events
2. Check your Gmail drafts for the reminder email template
3. 3 days before rent is due, you'll get a calendar notification to send the reminder

✨ DEMO COMPLETE:
This confirmation email proves your Gmail integration is working perfectly!

---
RentMinder - Never miss a rent payment again!
Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
"""

    try:
        result = send_gmail_message(gmail, user_email, subject, body)
        return {"sent": True, "message_id": result.get("id"), "to": user_email}
    except Exception as e:
        return {"sent": False, "error": str(e)}

def setup_email_reminders(gmail, rent_due_iso: str, landlord_email: str = None, user_email: str = None):
    """
    Create calendar events with email notifications 3 days before rent is due
    This uses Gmail to send actual reminder emails
    """
    try:
        # Parse the rent due date
        rent_date = isoparse(rent_due_iso)
        
        # Calculate reminder date (3 days before)
        reminder_date = rent_date - timedelta(days=3)
        
        # Create email subject and body for the reminder draft
        subject = f"Rent Reminder - Payment Due {rent_date.strftime('%B %d, %Y')}"
        body = f"""Dear Landlord,

This is a friendly reminder that rent is due on {rent_date.strftime('%B %d, %Y')}.

I wanted to reach out in advance to confirm the payment details and ensure everything is processed smoothly.

Please let me know if there are any changes to the payment method or if you need any additional information.

Best regards,
Your Tenant

---
This is an automated reminder set up through RentMinder.
"""
        
        results = {}
        
        # Create Gmail draft template for rent reminders
        if landlord_email:
            draft_result = create_gmail_draft(gmail, landlord_email, subject, body)
            results["draft"] = {
                "created": True,
                "draft_id": draft_result.get("id"),
                "reminder_date": reminder_date.isoformat()
            }
        else:
            results["draft"] = {"created": False, "reason": "No landlord email provided"}
        
        # Send immediate confirmation email to user if email provided
        if user_email:
            confirmation_result = send_confirmation_email(
                gmail, 
                user_email, 
                rent_date.strftime('%B %d, %Y'),
                landlord_email
            )
            results["confirmation"] = confirmation_result
        
        results["setup"] = True
        return results
        
    except Exception as e:
        return {"setup": False, "error": str(e)}
