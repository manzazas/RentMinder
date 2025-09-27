#!/usr/bin/env python3
"""
Simple API test using Python requests
"""
import requests
import os

def test_api():
    """Test the API with file upload"""
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:5000/health")
        print(f"✅ Server is running: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"❌ Server not running: {e}")
        return
    
    # Test file upload
    pdf_path = "files-testing/NY_JohnPork_.pdf"
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    try:
        print(f"\n🔄 Testing file upload with: {pdf_path}")
        
        with open(pdf_path, "rb") as f:
            files = {"file": ("NY_JohnPork_.pdf", f, "application/pdf")}
            response = requests.post("http://localhost:5000/api/parse", files=files)
        
        print(f"✅ Upload successful! Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n📄 Parsed Data:")
            print("=" * 50)
            
            # Pretty print the structured data
            import json
            print(json.dumps(result["parsed"], indent=2))
            
            print("\n🔍 Raw Gemini Output:")
            print("=" * 50)
            print(json.dumps(result["raw_gemini"], indent=2))
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error during upload: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api()

