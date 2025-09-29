# 🏠 RentMinder  

*A lightweight copilot for renters — parse your lease, spot red flags, and never miss a due date.*  

## 🏆 **BYTE Hacks 2025 — 2nd Place Winner** 🎉  

---

## ✨ What It Does  
- **Lease Parsing (Gemini)** → Extracts rent, deposit, term, renewal window, and landlord info from PDFs/images.  
- **Red Flags** → Flags missing renewal notices, oversized deposits, vague late fees, etc.  
- **Calendar Integration** → Adds recurring rent + renewal reminders to Google Calendar (with ICS fallback).  
- **Gmail Drafts** → Generates pre-filled maintenance request emails citing the lease.  

---

## 🛠 Tech Stack  
- **Backend**: Flask (Python 3)  
- **AI**: Google Gemini API (`google-generativeai`)  
- **DB**: Firebase Firestore  
- **Integrations**: Google Calendar & Gmail APIs (OAuth)  
- **UI**: Bootstrap  

---

## ⚙️ Setup  
```bash
python -m venv env && source env/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your keys
flask run --port 8000
