import sqlite3
import os
from pathlib import Path
from datetime import datetime

DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "followup.db")

def init_db():
    """Initializes the SQLite database with required tables."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Patients Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone_number TEXT NOT NULL UNIQUE,
            surgery_type TEXT,
            surgery_date TEXT,
            doctor_phone TEXT
        )
    ''')

    # Check-ins/Responses Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            date TEXT,
            message_sent TEXT,
            patient_response TEXT,
            pain_level INTEGER,
            symptoms_flagged TEXT,
            requires_alert BOOLEAN,
            FOREIGN KEY(patient_id) REFERENCES patients(id)
        )
    ''')

    conn.commit()
    conn.close()

def add_patient(name, phone_number, surgery_type, surgery_date, doctor_phone):
    """Adds a new patient to the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO patients (name, phone_number, surgery_type, surgery_date, doctor_phone)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, phone_number, surgery_type, surgery_date, doctor_phone))
        conn.commit()
    except sqlite3.IntegrityError:
        print(f"Patient with phone {phone_number} already exists.")
    finally:
        conn.close()

def get_patient_by_phone(phone_number):
    """Retrieves a patient record by phone number."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM patients WHERE phone_number = ?', (phone_number,))
    patient = cursor.fetchone()
    conn.close()
    return dict(patient) if patient else None

def get_all_patients():
    """Retrieves all monitored patients."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM patients')
    patients = cursor.fetchall()
    conn.close()
    return [dict(p) for p in patients]

def add_checkin(patient_id, message_sent, patient_response, pain_level, symptoms_flagged, requires_alert):
    """Records a patient's response and LLM evaluation."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO checkins (patient_id, date, message_sent, patient_response, pain_level, symptoms_flagged, requires_alert)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (patient_id, now_str, message_sent, patient_response, pain_level, symptoms_flagged, requires_alert))
    conn.commit()
    conn.close()

def get_recent_checkins(limit=50):
    """Retrieves the most recent check-ins for the dashboard."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.*, p.name as patient_name, p.phone_number 
        FROM checkins c
        JOIN patients p ON c.patient_id = p.id
        ORDER BY c.date DESC
        LIMIT ?
    ''', (limit,))
    checkins = cursor.fetchall()
    conn.close()
    return [dict(c) for c in checkins]

if __name__ == "__main__":
    init_db()
    print("Followup DB initialized.")
