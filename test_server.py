#!/usr/bin/env python3
"""
Minimal Flask server for testing API endpoints without Firebase
"""
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from app.parser_gemini import parse_lease_bytes
from app.mappers import map_zach_to_leaseextract

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow all origins for testing

@app.route("/")
def index():
    return {"ok": True, "service": "Lease Parser Test API", "endpoints": ["/health", "/api/parse"]}

@app.route("/health")
def health():
    return {"ok": True}

@app.route("/api/parse", methods=["POST"])
def parse_and_save():
    """Test endpoint for parsing PDFs"""
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    f = request.files["file"]
    raw = f.read()
    mime = f.mimetype or "application/pdf"

    try:
        # 1) Gemini → flat (Zach-style)
        flat = parse_lease_bytes(raw, mime)
        
        # 2) Map → structured schema
        data = map_zach_to_leaseextract(flat)
        
        return jsonify({
            "parsed": data,
            "raw_gemini": flat,
            "success": True
        })
        
    except Exception as e:
        return jsonify({"error": "parsing_failed", "detail": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Starting test server...")
    print("📡 Endpoints:")
    print("   GET  /health - Health check")
    print("   POST /api/parse - Upload PDF for parsing")
    print("   GET  / - API info")
    print("\n🔗 Test with: curl -X POST -F 'file=@files-testing/NY_JohnPork_.pdf' http://localhost:5000/api/parse")
    app.run(host="0.0.0.0", port=5000, debug=True)

