from app.mediconnect import database as mediconnect_db
from datetime import datetime

def seed_database():
    print("Checking and seeding data into mediconnect.db...")
    mediconnect_db.init_db()

    # 1. Create Organizations
    orgs = [
        {
            "name": "City General Hospital",
            "type": "hospital",
            "code": "CITY",
            "address": "123 Health Ave",
        },
        {
            "name": "Green Health Pharmacy",
            "type": "pharmacy",
            "code": "GREEN",
            "address": "45 Med Street",
        },
        {
            "name": "City Diagnostics Lab",
            "type": "lab",
            "code": "LAB",
            "address": "88 Science Road",
        },
        {
            "name": "MediConnect HQ",
            "type": "platform",
            "code": "HQ",
            "address": "1 Admin Plaza",
        },
    ]

    org_map = {}
    for o in orgs:
        org = mediconnect_db.get_organization_by_code(o["code"])
        if not org:
            print(f"Creating Organization {o['name']}...")
            org = mediconnect_db.create_organization(o["name"], o["type"], o["code"], o["address"])
        org_map[o["code"]] = org["id"]

    # 2. Create Users
    roles = [
        {"role": "admin", "code": "ADM001", "name": "Admin Raj Patel", "org": "CITY"},
        {"role": "doctor", "code": "DOC001", "name": "Dr. Sarah Chen", "org": "CITY"},
        {"role": "nurse", "code": "NUR001", "name": "Nurse Priya Sharma", "org": "CITY"},
        {"role": "pharmacy", "code": "PH001", "name": "Pharmacist John Doe", "org": "GREEN"},
        {"role": "diagnostic", "code": "LAB001", "name": "Lab Tech Mike Ross", "org": "LAB"},
        {"role": "super_admin", "code": "SUPER001", "name": "Super Admin", "org": "HQ"},
    ]

    conn = mediconnect_db.get_db()
    c = conn.cursor()
    for r in roles:
        c.execute("SELECT * FROM users WHERE employee_id = ?", (r["code"],))
        existing = c.fetchone()
        if not existing:
            print(f"Creating User {r['role']}: {r['name']}...")
            mediconnect_db.create_user(org_map[r["org"]], r["code"], r["name"], r["role"], "password")
        else:
            if existing["organization_id"] != org_map[r["org"]]:
                print(f"Updating {r['name']} to org {r['org']}...")
                c.execute("UPDATE users SET organization_id = ? WHERE id = ?", (org_map[r["org"]], existing["id"]))
                conn.commit()

    conn.close()

    # 3. Create Demo Patients
    patients = [
        {"unique_id": "PAT-2026-001", "name": "John Smith", "dob": "1980-05-15T00:00:00.000Z", "gender": "Male", "contact": "+1555123456", "blood_group": "O+"},
        {"unique_id": "PAT-2026-002", "name": "Emily Davis", "dob": "1992-11-20T00:00:00.000Z", "gender": "Female", "contact": "+1555987654", "blood_group": "A-"},
    ]
    for p in patients:
        existing = mediconnect_db.search_patients(p["unique_id"])
        if not existing:
            print(f"Creating Patient: {p['name']}...")
            mediconnect_db.create_patient(p["unique_id"], p["name"], p["dob"], p["gender"], p["contact"], p["blood_group"])

    print("Seed completed.")

if __name__ == "__main__":
    seed_database()
