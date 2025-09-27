import os
import json
import base64
import google.generativeai as genai

MODEL_NAME = "gemini-2.5-flash"

PROMPT = """
Extract lease info. Return ONLY valid JSON (no prose, no backticks) with keys:
{
  "tenant_name": string|null,
  "landlord_name": string|null,
  "property_address": string|null,
  "monthly_rent": number|null,
  "security_deposit": number|null,
  "lease_start_date": "YYYY-MM-DD" | null,
  "lease_end_date": "YYYY-MM-DD" | null,
  "rent_due_date": number|null,     // calendar day 1..31 if stated
  "late_fee_rule": string|null,     // brief text or null
  "maintenance_contact": string|null,
  "renewal_notice_start": "YYYY-MM-DD" | null,
  "renewal_notice_end": "YYYY-MM-DD" | null,
  "repairs_sla_days": number|null,
  "source_notes": [{ "page": number, "quote": string }]
}
Normalize money to numbers; dates to ISO; return null when unknown.
Include 1-3 source_notes with page + exact quote supporting key fields (rent amount, term, due date if any).
"""

def _clean_number(v):
    if v is None: return None
    try:
        return float(str(v).replace("$", "").replace(",", ""))
    except Exception:
        return None

def _postprocess(parsed: dict) -> dict:
    # normalize numerics and defaults
    if "monthly_rent" in parsed:
        parsed["monthly_rent"] = _clean_number(parsed["monthly_rent"])
    if "security_deposit" in parsed:
        parsed["security_deposit"] = _clean_number(parsed["security_deposit"])
    if not isinstance(parsed.get("source_notes"), list):
        parsed["source_notes"] = []
    return parsed

def parse_lease_bytes(file_bytes: bytes, mime_type: str) -> dict:
    """Call Gemini on the uploaded file and return Zach-style flat JSON."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set in environment")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(MODEL_NAME)
    
    # Convert bytes to base64 string
    pdf_data = base64.b64encode(file_bytes).decode('utf-8')
    
    # Create the file part for the model
    file_part = {
        "mime_type": mime_type or "application/pdf",
        "data": pdf_data
    }
    
    response = model.generate_content([file_part, PROMPT])
    
    # Clean the response text
    clean_text = response.text.strip()
    
    # Remove markdown code blocks if present
    if clean_text.startswith('```json'):
        clean_text = clean_text.replace('```json', '').replace('```', '').strip()
    elif clean_text.startswith('```'):
        clean_text = clean_text.replace('```', '').strip()
    
    # Remove any leading/trailing quotes or other characters that aren't part of JSON
    clean_text = clean_text[clean_text.find('{'):clean_text.rfind('}') + 1]
    
    try:
        data = json.loads(clean_text)
    except Exception as e:
        # helpful debug if model returned junk
        raise RuntimeError(f"Gemini returned non-JSON: {clean_text[:300]}...") from e
    
    return _postprocess(data)
