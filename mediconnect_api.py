from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import mediconnect_db
from datetime import datetime
import json
import sqlite3

router = APIRouter()

# --- WebSockets ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Just keeping connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- Models ---
class LoginRequest(BaseModel):
    orgCode: str
    employeeId: str
    password: str

class StaffRequest(BaseModel):
    organizationId: int
    employeeId: str
    name: str
    role: str
    password: str

class OrgRequest(BaseModel):
    name: str
    type: str
    code: str
    address: Optional[str] = None
    adminEmployeeId: str
    adminPassword: str

class PatientRequest(BaseModel):
    name: str
    dob: str
    gender: str
    contact: Optional[str] = None
    bloodGroup: Optional[str] = None

class VisitRequest(BaseModel):
    patientId: int
    organizationId: int
    vitals: Optional[Dict[str, Any]] = None
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    priority: Optional[str] = 'normal'
    attendedBy: Optional[int] = None

class VisitPatchRequest(BaseModel):
    diagnosis: Optional[str] = None
    symptoms: Optional[str] = None
    priority: Optional[str] = None

class ActionRequest(BaseModel):
    patientId: int
    visitId: Optional[int] = None
    authorId: int
    fromOrganizationId: int
    type: str
    description: str
    payload: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class ActionPatchRequest(BaseModel):
    status: str
    notes: Optional[str] = None
    completedBy: Optional[int] = None
    completedByOrganizationId: Optional[int] = None

class TransferRequest(BaseModel):
    patientId: int
    targetOrgId: int
    fromOrgId: int
    authorId: int
    notes: Optional[str] = None

# --- Auth ---
@router.post("/api/login")
async def login(req: LoginRequest):
    orgCode = req.orgCode.strip()
    employeeId = req.employeeId.strip()
    
    org = mediconnect_db.get_organization_by_code(orgCode)
    if not org:
        raise HTTPException(status_code=401, detail="Invalid Organization Code")
        
    user = mediconnect_db.get_user_by_credentials(org["id"], employeeId, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Credentials")
        
    user_copy = dict(user)
    user_copy.pop("password", None)
    user_copy["organization"] = org
    # Ensure keys match frontend camelCase where expected
    user_copy["organizationId"] = user_copy.pop("organization_id", None)
    user_copy["employeeId"] = user_copy.pop("employee_id", None)
    return user_copy

# --- Staff ---
@router.get("/api/staff")
async def get_staff(organizationId: int):
    staff = mediconnect_db.get_staff_by_org(organizationId)
    for s in staff:
        s["organizationId"] = s.pop("organization_id", None)
        s["employeeId"] = s.pop("employee_id", None)
    return staff

@router.post("/api/staff")
async def create_staff(req: StaffRequest):
    try:
        user = mediconnect_db.create_user(req.organizationId, req.employeeId, req.name, req.role, req.password)
        user_copy = dict(user)
        user_copy.pop("password", None)
        user_copy["organizationId"] = user_copy.pop("organization_id", None)
        user_copy["employeeId"] = user_copy.pop("employee_id", None)
        return user_copy
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Employee ID might be taken")

# --- Organizations ---
@router.get("/api/admin/organizations")
async def get_all_organizations():
    return mediconnect_db.get_all_organizations()

@router.get("/api/hospitals")
async def get_hospitals():
    orgs = mediconnect_db.get_all_organizations()
    return [o for o in orgs if o["type"] == "hospital"]

@router.post("/api/admin/organizations")
async def register_organization(req: OrgRequest):
    try:
        org = mediconnect_db.create_organization(req.name.strip(), req.type, req.code.strip().upper(), req.address)
        user = mediconnect_db.create_user(org["id"], req.adminEmployeeId.strip(), f"{req.name.strip()} Admin", "admin", req.adminPassword)
        user_copy = dict(user)
        user_copy.pop("password", None)
        return {"organization": org, "admin": user_copy}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Organization Code or Admin ID already exists")

@router.delete("/api/admin/organizations/{org_id}")
async def delete_organization(org_id: int):
    if org_id <= 4:
        raise HTTPException(status_code=403, detail="Cannot delete default demo organizations")
    
    conn = mediconnect_db.get_db()
    c = conn.cursor()
    try:
        # We should use transaction manually here
        c.execute("BEGIN TRANSACTION")
        c.execute("DELETE FROM users WHERE organization_id = ?", (org_id,))
        c.execute("DELETE FROM organizations WHERE id = ?", (org_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete organization")
    finally:
        conn.close()
    return {"message": "Organization deleted successfully"}

# --- Patients ---
@router.get("/api/patients/search")
async def search_patients(query: str):
    patients = mediconnect_db.search_patients(query)
    for p in patients:
        p["uniqueId"] = p.pop("unique_id", None)
        p["bloodGroup"] = p.pop("blood_group", None)
    return patients

@router.post("/api/patients")
async def create_patient(req: PatientRequest):
    import random
    unique_id = f"PAT-{random.randint(100000, 999999)}"
    patient = mediconnect_db.create_patient(unique_id, req.name, req.dob, req.gender, req.contact, req.bloodGroup)
    patient_copy = dict(patient)
    patient_copy["uniqueId"] = patient_copy.pop("unique_id", None)
    patient_copy["bloodGroup"] = patient_copy.pop("blood_group", None)
    
    await manager.broadcast({"type": "NEW_PATIENT", "patient": patient_copy})
    return patient_copy

@router.get("/api/patients")
async def get_all_patients():
    patients = mediconnect_db.get_all_patients()
    for p in patients:
        p["uniqueId"] = p.pop("unique_id", None)
        p["bloodGroup"] = p.pop("blood_group", None)
    return patients

@router.put("/api/patients/{patient_id}")
async def update_patient(patient_id: int, req: PatientRequest):
    conn = mediconnect_db.get_db()
    c = conn.cursor()
    c.execute(
        "UPDATE patients SET name=?, dob=?, gender=?, contact=?, blood_group=? WHERE id=? RETURNING *",
        (req.name, req.dob, req.gender, req.contact, req.bloodGroup, patient_id)
    )
    patient = c.fetchone()
    conn.commit()
    conn.close()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient_copy = dict(patient)
    patient_copy["uniqueId"] = patient_copy.pop("unique_id", None)
    patient_copy["bloodGroup"] = patient_copy.pop("blood_group", None)
    return patient_copy

@router.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: int):
    conn = mediconnect_db.get_db()
    c = conn.cursor()
    try:
        c.execute("BEGIN TRANSACTION")
        c.execute("DELETE FROM clinical_actions WHERE patient_id = ?", (patient_id,))
        c.execute("DELETE FROM clinical_visits WHERE patient_id = ?", (patient_id,))
        c.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete patient")
    finally:
        conn.close()
    return {"message": "Patient deleted successfully"}

@router.get("/api/patients/{patient_id}")
async def get_patient(patient_id: int):
    patient = mediconnect_db.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_copy = dict(patient)
    patient_copy["uniqueId"] = patient_copy.pop("unique_id", None)
    patient_copy["bloodGroup"] = patient_copy.pop("blood_group", None)
    return patient_copy

@router.get("/api/patients/{patient_id}/details")
async def get_patient_details(patient_id: int):
    details = mediconnect_db.get_patient_details(patient_id)
    
    # Format visits
    visits = []
    for v in details["visits"]:
        v_copy = dict(v)
        v_copy["patientId"] = v_copy.pop("patient_id", None)
        v_copy["organizationId"] = v_copy.pop("organization_id", None)
        v_copy["attendedBy"] = v_copy.pop("attended_by", None)
        if v_copy.get("vitals") and isinstance(v_copy["vitals"], str):
            v_copy["vitals"] = json.loads(v_copy["vitals"])
        visits.append({
            "visit": v_copy,
            "orgName": v_copy.pop("orgName", None),
            "staffName": v_copy.pop("staffName", None)
        })
        
    # Format actions
    flat_actions = []
    for a in details["actions"]:
        a_copy = dict(a)
        if a_copy.get("payload") and isinstance(a_copy["payload"], str):
            a_copy["payload"] = json.loads(a_copy["payload"])
            
        flat_actions.append({
            "id": a_copy["id"],
            "patientId": a_copy.pop("patient_id", None),
            "type": a_copy["type"],
            "status": a_copy["status"],
            "description": a_copy["description"],
            "payload": a_copy.pop("payload", None),
            "createdAt": a_copy.pop("created_at", None),
            "updatedAt": a_copy.pop("updated_at", None),
            "completedAt": a_copy.pop("completed_at", None),
            "notes": a_copy.get("notes"),
            "authorName": a_copy.pop("authorName", "Unknown"),
            "orgName": a_copy.pop("orgName", "Unknown")
        })
        
    return {"visits": visits, "actions": flat_actions}

# --- Visits ---
@router.post("/api/visits")
async def create_visit(req: VisitRequest):
    now = datetime.utcnow().isoformat()
    visit = mediconnect_db.create_visit(
        req.patientId, req.organizationId, now, 
        req.vitals, req.symptoms, req.priority
    )
    if req.attendedBy:
        conn = mediconnect_db.get_db()
        c = conn.cursor()
        c.execute("UPDATE clinical_visits SET attended_by = ? WHERE id = ? RETURNING *", (req.attendedBy, visit["id"]))
        visit = c.fetchone()
        conn.commit()
        conn.close()
        
    v_copy = dict(visit)
    v_copy["patientId"] = v_copy.pop("patient_id", None)
    v_copy["organizationId"] = v_copy.pop("organization_id", None)
    v_copy["attendedBy"] = v_copy.pop("attended_by", None)
    if v_copy.get("vitals") and isinstance(v_copy["vitals"], str):
        v_copy["vitals"] = json.loads(v_copy["vitals"])
    return v_copy

@router.get("/api/visits/active-emergencies")
async def get_active_emergencies():
    emergencies = mediconnect_db.get_active_emergencies()
    results = []
    for e in emergencies:
        visit_obj = dict(e)
        visit_obj["patientId"] = visit_obj.pop("patient_id", None)
        visit_obj["organizationId"] = visit_obj.pop("organization_id", None)
        visit_obj["attendedBy"] = visit_obj.pop("attended_by", None)
        if visit_obj.get("vitals") and isinstance(visit_obj["vitals"], str):
            visit_obj["vitals"] = json.loads(visit_obj["vitals"])
            
        patient_obj = {
            "id": visit_obj["patientId"],
            "name": visit_obj.pop("patient_name", None),
            "uniqueId": visit_obj.pop("unique_id", None)
        }
        
        results.append({
            "visit": visit_obj,
            "patient": patient_obj,
            "attendedBy": visit_obj.pop("attended_by_name", None)
        })
    return results

@router.patch("/api/visits/{visit_id}")
async def patch_visit(visit_id: int, req: VisitPatchRequest):
    visit = mediconnect_db.update_visit(visit_id, req.diagnosis, req.symptoms, req.priority)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
        
    v_copy = dict(visit)
    v_copy["patientId"] = v_copy.pop("patient_id", None)
    v_copy["organizationId"] = v_copy.pop("organization_id", None)
    v_copy["attendedBy"] = v_copy.pop("attended_by", None)
    if v_copy.get("vitals") and isinstance(v_copy["vitals"], str):
        v_copy["vitals"] = json.loads(v_copy["vitals"])
        
    await manager.broadcast({"type": "UPDATE_VISIT", "visit": v_copy})
    return v_copy

# --- Actions ---
@router.post("/api/actions")
async def create_action(req: ActionRequest):
    action = mediconnect_db.create_action(
        req.patientId, req.visitId, req.authorId, req.fromOrganizationId,
        req.type, req.description, req.payload
    )
    if req.notes:
        conn = mediconnect_db.get_db()
        c = conn.cursor()
        c.execute("UPDATE clinical_actions SET notes = ? WHERE id = ? RETURNING *", (req.notes, action["id"]))
        action = c.fetchone()
        conn.commit()
        conn.close()
        
    a_copy = dict(action)
    a_copy["patientId"] = a_copy.pop("patient_id", None)
    a_copy["visitId"] = a_copy.pop("visit_id", None)
    a_copy["authorId"] = a_copy.pop("author_id", None)
    a_copy["fromOrganizationId"] = a_copy.pop("from_organization_id", None)
    a_copy["createdAt"] = a_copy.pop("created_at", None)
    a_copy["updatedAt"] = a_copy.pop("updated_at", None)
    a_copy["completedAt"] = a_copy.pop("completed_at", None)
    a_copy["completedBy"] = a_copy.pop("completed_by", None)
    a_copy["completedByOrganizationId"] = a_copy.pop("completed_by_organization_id", None)
    if a_copy.get("payload") and isinstance(a_copy["payload"], str):
        a_copy["payload"] = json.loads(a_copy["payload"])
        
    await manager.broadcast({"type": "NEW_ACTION", "action": a_copy})
    return a_copy

@router.patch("/api/actions/{action_id}")
async def patch_action(action_id: int, req: ActionPatchRequest):
    action = mediconnect_db.update_action(
        action_id, req.status, req.notes, req.completedBy, req.completedByOrganizationId
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    a_copy = dict(action)
    a_copy["patientId"] = a_copy.pop("patient_id", None)
    a_copy["visitId"] = a_copy.pop("visit_id", None)
    a_copy["authorId"] = a_copy.pop("author_id", None)
    a_copy["fromOrganizationId"] = a_copy.pop("from_organization_id", None)
    a_copy["createdAt"] = a_copy.pop("created_at", None)
    a_copy["updatedAt"] = a_copy.pop("updated_at", None)
    a_copy["completedAt"] = a_copy.pop("completed_at", None)
    a_copy["completedBy"] = a_copy.pop("completed_by", None)
    a_copy["completedByOrganizationId"] = a_copy.pop("completed_by_organization_id", None)
    if a_copy.get("payload") and isinstance(a_copy["payload"], str):
        a_copy["payload"] = json.loads(a_copy["payload"])
        
    await manager.broadcast({"type": "UPDATE_ACTION", "action": a_copy})
    return a_copy

# --- Departments ---
@router.get("/api/departments/{role}/queue")
async def get_department_queue(role: str):
    actions = mediconnect_db.get_department_queue([role])
    flat = []
    for a in actions:
        a_copy = dict(a)
        if a_copy.get("payload") and isinstance(a_copy["payload"], str):
            a_copy["payload"] = json.loads(a_copy["payload"])
            
        flat.append({
            "id": a_copy["id"],
            "patientId": a_copy.pop("patient_id", None),
            "type": a_copy["type"],
            "status": a_copy["status"],
            "description": a_copy["description"],
            "payload": a_copy.pop("payload", None),
            "createdAt": a_copy.pop("created_at", None),
            "updatedAt": a_copy.pop("updated_at", None),
            "completedAt": a_copy.pop("completed_at", None),
            "notes": a_copy.get("notes"),
            "patientName": a_copy.pop("patientName", "Unknown"),
            "uniqueId": a_copy.pop("uniqueId", "N/A"),
            "authorName": a_copy.pop("authorName", "Unknown"),
            "orgName": a_copy.pop("orgName", "Unknown")
        })
    return flat

# --- Transfers ---
@router.post("/api/transfers")
async def create_transfer(req: TransferRequest):
    payload = {"targetOrgId": req.targetOrgId}
    action = mediconnect_db.create_action(
        req.patientId, None, req.authorId, req.fromOrgId,
        "transfer", "Patient Transfer Request", payload
    )
    if req.notes:
        conn = mediconnect_db.get_db()
        c = conn.cursor()
        c.execute("UPDATE clinical_actions SET notes = ? WHERE id = ? RETURNING *", (req.notes, action["id"]))
        action = c.fetchone()
        conn.commit()
        conn.close()
        
    a_copy = dict(action)
    a_copy["patientId"] = a_copy.pop("patient_id", None)
    a_copy["visitId"] = a_copy.pop("visit_id", None)
    a_copy["authorId"] = a_copy.pop("author_id", None)
    a_copy["fromOrganizationId"] = a_copy.pop("from_organization_id", None)
    a_copy["createdAt"] = a_copy.pop("created_at", None)
    a_copy["updatedAt"] = a_copy.pop("updated_at", None)
    a_copy["completedAt"] = a_copy.pop("completed_at", None)
    a_copy["completedBy"] = a_copy.pop("completed_by", None)
    a_copy["completedByOrganizationId"] = a_copy.pop("completed_by_organization_id", None)
    if a_copy.get("payload") and isinstance(a_copy["payload"], str):
        a_copy["payload"] = json.loads(a_copy["payload"])
        
    await manager.broadcast({"type": "NEW_ACTION", "action": a_copy})
    return a_copy

# --- Stats ---
@router.get("/api/stats")
async def get_stats():
    return mediconnect_db.get_stats()
