import os
from dotenv import load_dotenv, find_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv(find_dotenv(usecwd=True) or ".env", override=True)

cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not cred_path or not os.path.exists(cred_path):
    raise RuntimeError("Set GOOGLE_APPLICATION_CREDENTIALS in .env to your serviceAccount.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def save_lease(user_id: str, lease_dict: dict):
    doc = {**lease_dict, "user_id": user_id}
    db.collection("leases").add(doc)
    return doc
