import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

DATABASE_URL = "mediconnect.db"

def init_db():
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Enum constraints in SQLite are usually managed by application logic, 
    # but we define TEXT fields for simplicity.
    
    # 1. Organizations (Hospitals, Pharmacies, Labs)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- hospital, pharmacy, lab, platform
            code TEXT NOT NULL UNIQUE, -- e.g., "CITYHOSP" for login
            address TEXT
        )
    ''')
    
    # 2. Users (linked to an Organization)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            employee_id TEXT NOT NULL, -- e.g., "DOC001"
            name TEXT NOT NULL,
            role TEXT NOT NULL, -- doctor, nurse, pharmacy, diagnostic, admin, super_admin
            password TEXT NOT NULL,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            UNIQUE(organization_id, employee_id)
        )
    ''')
    
    # 3. Patients (Global Registry)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unique_id TEXT NOT NULL UNIQUE, -- e.g., "PAT-2024-001"
            name TEXT NOT NULL,
            dob TEXT NOT NULL, -- Stored as ISO string
            gender TEXT NOT NULL,
            contact TEXT,
            blood_group TEXT
        )
    ''')
    
    # 4. Clinical Visits (Encounters at a specific organization)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clinical_visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            date TEXT NOT NULL, -- Stored as ISO string
            vitals TEXT, -- JSON string
            symptoms TEXT,
            diagnosis TEXT,
            priority TEXT DEFAULT 'normal', -- normal, emergency, critical
            attended_by INTEGER,
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (attended_by) REFERENCES users(id)
        )
    ''')
    
    # 5. Clinical Actions (Orders/Requests)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clinical_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            visit_id INTEGER,
            author_id INTEGER NOT NULL,
            from_organization_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- prescription, lab_test, radiology, procedure, observation, transfer
            status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
            description TEXT NOT NULL,
            payload TEXT, -- JSON string
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            completed_by INTEGER,
            completed_by_organization_id INTEGER,
            notes TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (visit_id) REFERENCES clinical_visits(id),
            FOREIGN KEY (author_id) REFERENCES users(id),
            FOREIGN KEY (from_organization_id) REFERENCES organizations(id),
            FOREIGN KEY (completed_by) REFERENCES users(id),
            FOREIGN KEY (completed_by_organization_id) REFERENCES organizations(id)
        )
    ''')

    conn.commit()
    conn.close()

# Helper dict factory for SQL rows
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = dict_factory
    return conn

# --- Organizations ---
def create_organization(name: str, type: str, code: str, address: Optional[str] = None) -> Dict:
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO organizations (name, type, code, address) VALUES (?, ?, ?, ?) RETURNING *",
        (name, type, code, address)
    )
    org = c.fetchone()
    conn.commit()
    conn.close()
    return org

def get_organization_by_code(code: str) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM organizations WHERE code = ?", (code,))
    org = c.fetchone()
    conn.close()
    return org

def get_all_organizations() -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM organizations ORDER BY id DESC")
    orgs = c.fetchall()
    conn.close()
    return orgs

# --- Users ---
def create_user(org_id: int, employee_id: str, name: str, role: str, password: str) -> Dict:
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO users (organization_id, employee_id, name, role, password) VALUES (?, ?, ?, ?, ?) RETURNING *",
        (org_id, employee_id, name, role, password)
    )
    user = c.fetchone()
    conn.commit()
    conn.close()
    return user

def get_user_by_credentials(org_id: int, employee_id: str, password: str) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM users WHERE organization_id = ? AND employee_id = ? AND password = ?",
        (org_id, employee_id, password)
    )
    user = c.fetchone()
    conn.close()
    return user

def get_staff_by_org(org_id: int) -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, organization_id, employee_id, name, role FROM users WHERE organization_id = ? ORDER BY role DESC", (org_id,))
    users = c.fetchall()
    conn.close()
    return users

# --- Patients ---
def create_patient(unique_id: str, name: str, dob: str, gender: str, contact: str, blood_group: str) -> Dict:
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO patients (unique_id, name, dob, gender, contact, blood_group) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
        (unique_id, name, dob, gender, contact, blood_group)
    )
    patient = c.fetchone()
    conn.commit()
    conn.close()
    return patient

def search_patients(query: str) -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    like_q = f"%{query}%"
    c.execute(
        "SELECT * FROM patients WHERE unique_id = ? OR name LIKE ? OR unique_id LIKE ?",
        (query, like_q, like_q)
    )
    patients = c.fetchall()
    conn.close()
    return patients

def get_patient_by_id(patient_id: int) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    p = c.fetchone()
    conn.close()
    return p

def get_all_patients() -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM patients ORDER BY id DESC")
    patients = c.fetchall()
    conn.close()
    return patients

# --- Visits ---
def create_visit(patient_id: int, org_id: int, date: str, vitals: dict, symptoms: str, priority: str = 'normal') -> Dict:
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO clinical_visits (patient_id, organization_id, date, vitals, symptoms, priority) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
        (patient_id, org_id, date, json.dumps(vitals) if vitals else None, symptoms, priority)
    )
    visit = c.fetchone()
    conn.commit()
    conn.close()
    return visit

def update_visit(visit_id: int, diagnosis: str, symptoms: str, priority: str) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    updates = []
    params = []
    if diagnosis is not None:
        updates.append("diagnosis = ?")
        params.append(diagnosis)
    if symptoms is not None:
        updates.append("symptoms = ?")
        params.append(symptoms)
    if priority is not None:
        updates.append("priority = ?")
        params.append(priority)
    
    if not updates:
        return None
        
    params.append(visit_id)
    query = f"UPDATE clinical_visits SET {', '.join(updates)} WHERE id = ? RETURNING *"
    c.execute(query, tuple(params))
    visit = c.fetchone()
    conn.commit()
    conn.close()
    return visit

def get_active_emergencies() -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT v.*, p.name as patient_name, p.unique_id, u.name as attended_by_name
        FROM clinical_visits v
        JOIN patients p ON v.patient_id = p.id
        LEFT JOIN users u ON v.attended_by = u.id
        WHERE v.priority IN ('emergency', 'critical')
        ORDER BY v.date DESC
    ''')
    results = c.fetchall()
    conn.close()
    return results

def get_patient_details(patient_id: int) -> Dict:
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''
        SELECT v.*, o.name as orgName, u.name as staffName
        FROM clinical_visits v
        LEFT JOIN organizations o ON v.organization_id = o.id
        LEFT JOIN users u ON v.attended_by = u.id
        WHERE v.patient_id = ?
        ORDER BY v.date DESC
    ''', (patient_id,))
    visits = c.fetchall()
    
    c.execute('''
        SELECT a.*, u.name as authorName, o.name as orgName
        FROM clinical_actions a
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN organizations o ON a.from_organization_id = o.id
        WHERE a.patient_id = ?
        ORDER BY a.created_at DESC
    ''', (patient_id,))
    actions = c.fetchall()
    
    conn.close()
    return {"visits": visits, "actions": actions}

# --- Actions ---
def create_action(patient_id: int, visit_id: int, author_id: int, from_org_id: int, type: str, description: str, payload: dict) -> Dict:
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        '''INSERT INTO clinical_actions 
           (patient_id, visit_id, author_id, from_organization_id, type, description, payload, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *''',
        (patient_id, visit_id, author_id, from_org_id, type, description, json.dumps(payload) if payload else None, now, now)
    )
    action = c.fetchone()
    conn.commit()
    conn.close()
    return action

def update_action(action_id: int, status: str, notes: str, completed_by: int, completed_by_org_id: int) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    completed_at = now if status == 'completed' else None
    
    c.execute(
        '''UPDATE clinical_actions 
           SET status = ?, notes = ?, completed_by = ?, completed_by_organization_id = ?, completed_at = ?, updated_at = ?
           WHERE id = ? RETURNING *''',
        (status, notes, completed_by, completed_by_org_id, completed_at, now, action_id)
    )
    action = c.fetchone()
    conn.commit()
    conn.close()
    return action

def get_department_queue(roles: List[str]) -> List[Dict]:
    role_map = {
        'pharmacy': ['prescription'],
        'diagnostic': ['lab_test', 'radiology'],
        'nurse': ['observation', 'procedure', 'transfer']
    }
    
    action_types = []
    for role in roles:
        action_types.extend(role_map.get(role, []))
        
    if not action_types:
        return []
        
    conn = get_db()
    c = conn.cursor()
    placeholders = ','.join('?' * len(action_types))
    query = f'''
        SELECT a.*, p.name as patientName, p.unique_id as uniqueId, u.name as authorName, o.name as orgName
        FROM clinical_actions a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN organizations o ON a.from_organization_id = o.id
        WHERE a.type IN ({placeholders})
        ORDER BY a.created_at DESC
    '''
    c.execute(query, action_types)
    actions = c.fetchall()
    conn.close()
    return actions

def get_stats() -> Dict:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as count FROM patients")
    patients = c.fetchone()['count']
    c.execute("SELECT COUNT(*) as count FROM clinical_visits")
    visits = c.fetchone()['count']
    c.execute("SELECT COUNT(*) as count FROM clinical_actions WHERE status = 'pending'")
    pending = c.fetchone()['count']
    c.execute("SELECT COUNT(*) as count FROM clinical_actions WHERE status = 'completed'")
    completed = c.fetchone()['count']
    conn.close()
    return {
        "totalPatients": patients,
        "totalVisits": visits,
        "pendingActions": pending,
        "completedActions": completed
    }

if __name__ == "__main__":
    init_db()
    print("mediconnect.db initialized successfully.")
