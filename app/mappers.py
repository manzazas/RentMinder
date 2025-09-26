# app/mappers.py
def map_zach_to_leaseextract(z: dict) -> dict:
    """Map Zach's flat keys to the LeaseExtract schema your backend uses."""
    z = z or {}

    def num(v):
        if v is None: return None
        try:
            return float(str(v).replace(",", "").replace("$",""))
        except: return None

    def iso(s):
        # accept YYYY-MM-DD only; else None
        import re
        return s if isinstance(s,str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", s) else None

    out = {
        "rent": {
            "amount": num(z.get("monthly_rent")),
            "currency": "USD",
            "due_day": z.get("rent_due_date"),
            "late_fee_amount": None,
            "late_fee_type": None,
        },
        "deposit": {
            "amount": num(z.get("security_deposit")),
            "currency": "USD",
        },
        "lease_term": {
            "start_date": iso(z.get("lease_start_date")),
            "end_date": iso(z.get("lease_end_date")),
        },
        "renewal": {
            "notice_start": None,
            "notice_end": None,
        },
        "repairs": {
            "sla_days": None,
            "clause_ref": None,
            "contact_method": z.get("maintenance_contact"),
        },
        "landlord": {
            "name": z.get("landlord_name"),
            "email": None,
            "phone": None,
            "address": z.get("property_address"),
        },
        "red_flags": z.get("red_flags") or [],
        "source_notes": z.get("source_notes") or [],
    }
    return out
