
import os
import json
import base64
from dotenv import load_dotenv
from google import genai

load_dotenv()

# The client gets the API key from the environment variable `GEMINI_API_KEY`.
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

# This script uses the Gemini AI API to analyze and summarize PDF documents.
# It reads a PDF file from the local file system, converts it to base64 encoding,
# and sends it to Google's Gemini model for content analysis.

def main():
    prompt = """You are an information extractor. Return ONLY valid JSON (no backticks, no prose).
Keys (snake_case) and types:
{
  "tenant_name": string|null,
  "landlord_name": string|null,
  "property_address": string|null,
  "monthly_rent": number|null,
  "security_deposit": number|null,
  "lease_start_date": string|null,   // ISO YYYY-MM-DD
  "lease_end_date": string|null,     // ISO YYYY-MM-DD
  "rent_due_date": number|null,      // e.g., 1, 15, etc.
  "late_fee_rule": string|null,
  "maintenance_contact": string|null
}

Rules:
- If a field is missing or uncertain, set it to null (not empty string).
- Normalize dollar amounts to numbers (e.g., "$2,350.00" -> 2350).
- Normalize dates to ISO (guess month/day if clearly stated like "Sept 1, 2025").
- Normalize addresses: use city name, state abbreviation (e.g., "City of New York, State of New York" -> "New York, NY").
- Extract rent due date information (e.g., "due on the 1st", "payable by the 15th").
- Do NOT include any extra keys or comments.
"""

    # Read PDF file and convert to base64
    with open("files-testing/NY_JohnPork_.pdf", "rb") as pdf_file:
        pdf_data = base64.b64encode(pdf_file.read()).decode('utf-8')

    contents = [
        {
            "inlineData": {
                "mimeType": "application/pdf",
                "data": pdf_data
            }
        },
        {"text": prompt}
    ]

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents
    )
    
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
        json_info = json.loads(clean_text)
        print(json.dumps(json_info, indent=2))
    except json.JSONDecodeError as error:
        print("JSON parsing failed. Raw response:")
        print(response.text)
        print("\nCleaned text:")
        print(clean_text)
        print(f"\nError: {error}")
    except Exception as error:
        print(f"Unexpected error: {error}")

if __name__ == "__main__":
    main()
    client.close()