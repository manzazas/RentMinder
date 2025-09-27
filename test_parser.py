#!/usr/bin/env python3
"""
Test script for the lease parser without requiring Firebase credentials
"""
import os
from dotenv import load_dotenv
from app.parser_gemini import parse_lease_bytes

load_dotenv()

def test_parser():
    """Test the parser with your existing PDF file"""
    
    # Check if API key is set
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in .env file")
        return
    
    print("✅ GEMINI_API_KEY found")
    
    # Read the PDF file
    pdf_path = "files-testing/NY_JohnPork_.pdf"
    if not os.path.exists(pdf_path):
        print(f"❌ Error: PDF file not found at {pdf_path}")
        return
    
    print(f"✅ PDF file found: {pdf_path}")
    
    try:
        # Read PDF bytes
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        
        print(f"✅ PDF loaded: {len(pdf_bytes)} bytes")
        
        # Parse with Gemini
        print("🔄 Calling Gemini API...")
        result = parse_lease_bytes(pdf_bytes, "application/pdf")
        
        print("✅ Parsing successful!")
        print("\n📄 Extracted Data:")
        print("=" * 50)
        
        # Pretty print the results
        import json
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"❌ Error during parsing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_parser()

