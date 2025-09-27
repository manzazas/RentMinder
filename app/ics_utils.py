from icalendar import Calendar, Event, Alarm
from datetime import timedelta
from dateutil.parser import isoparse

def rent_recurring_ics(first_due_iso: str) -> bytes:
    cal = Calendar()
    cal.add('prodid', '-//LeaseCopilot//')
    cal.add('version', '2.0')

    start = isoparse(first_due_iso)
    ev = Event()
    ev.add('summary', 'Rent due')
    ev.add('dtstart', start)
    ev.add('dtend', start + timedelta(hours=1))
    ev.add('rrule', {'FREQ': 'MONTHLY', 'INTERVAL': 1})

    a1 = Alarm(); a1.add('action','DISPLAY'); a1.add('trigger', timedelta(days=-2))
    ev.add_component(a1)
    a2 = Alarm(); a2.add('action','DISPLAY'); a2.add('trigger', timedelta(hours=-9))
    ev.add_component(a2)

    cal.add_component(ev)
    return cal.to_ical()

def renewal_window_ics(start_date: str, end_date: str) -> bytes:
    cal = Calendar()
    cal.add('prodid', '-//LeaseCopilot//')
    cal.add('version', '2.0')

    ev = Event()
    ev.add('summary', 'Lease renewal window')
    # all-day events: set date strings directly (YYYYMMDD handled by icalendar from ISO)
    ev.add('dtstart', start_date)
    ev.add('dtend', end_date)  # exclusive in ICS
    cal.add_component(ev)

    return cal.to_ical()
