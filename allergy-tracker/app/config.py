import os
from zoneinfo import ZoneInfo

ZIP_CODE = os.environ.get("ALLERGY_ZIP", "06820")
LATITUDE = float(os.environ.get("ALLERGY_LAT", "41.0787"))
LONGITUDE = float(os.environ.get("ALLERGY_LON", "-73.4693"))
TIMEZONE_NAME = os.environ.get("ALLERGY_TZ", "America/New_York")
TIMEZONE = ZoneInfo(TIMEZONE_NAME)

DATA_DIR = os.environ.get("DATA_DIR", "/data" if os.path.isdir("/data") else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"))
DB_PATH = os.path.join(DATA_DIR, "allergy.db")

PASSCODE = os.environ.get("ALLERGY_PASSCODE", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:allergy-tracker@example.com")

SYMPTOMS = [
    ("sneezing", "Sneezing"),
    ("runny_nose", "Runny nose"),
    ("congestion", "Congestion"),
    ("itchy_eyes", "Itchy / watery eyes"),
    ("throat", "Throat irritation"),
    ("cough", "Cough"),
    ("headache", "Headache"),
    ("fatigue", "Fatigue"),
]
SYMPTOM_KEYS = [k for k, _ in SYMPTOMS]
