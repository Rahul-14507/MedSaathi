
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import io
import datetime
import uuid
import json
import base64
from dotenv import load_dotenv

from extractor import extract_text_from_file, extract_prescription_text
from analyzer import load_benchmarks, flag_values, generate_human_friendly_report, translate_and_simplify
from speech_engine import generate_audio
from db import get_db
from auth import router as auth_router, get_current_user_optional, get_current_user
from fastapi import Depends
from fastapi.responses import FileResponse

app = FastAPI(title="Lab Report Intelligence API")

# Include Auth Router
app.include_router(auth_router)

# Ensure data and static directories exist
os.makedirs("data", exist_ok=True)
os.makedirs("static", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")

HISTORY_FILE = "data/history.json"
SETTINGS_FILE = "data/settings.json"

def load_json(file_path, default=[]):
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return default
    return default

def save_json(file_path, data):
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)

app.mount("/app", StaticFiles(directory="static", html=True), name="static")

@app.post("/api/analyze")
async def analyze_report(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_optional)
):
    if not os.getenv("AZURE_OPENAI_KEY") or not os.getenv("AZURE_DOC_INTEL_KEY"):
        raise HTTPException(status_code=500, detail="Azure credentials are not configured properly.")

    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    try:
        extracted_data = extract_text_from_file(file_content)
        benchmarks = load_benchmarks()
        flags = flag_values(extracted_data, benchmarks)
        ai_report = generate_human_friendly_report(extracted_data, flags)

        report_id = str(uuid.uuid4())
        report_data = {
            "id": report_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "filename": file.filename,
            "flags": flags,
            "ai_report": ai_report,
            "extracted_data": extracted_data
        }

        if current_user:
            # Save to Cosmos DB
            db = get_db()
            if db.get("reports"):
                cosmos_record = {
                    "id": report_id,
                    "user_id": current_user["username"],
                    "timestamp": report_data["timestamp"],
                    "filename": report_data["filename"],
                    "flags": flags,
                    "ai_report": ai_report,
                    "extracted_data": extracted_data
                }
                db["reports"].create_item(body=cosmos_record)
                
                # Wow Factor 1 Preparation: Save discrete metrics for trends
                if db.get("metrics") and flags:
                    for flag in flags:
                        metric_doc = {
                            "id": str(uuid.uuid4()),
                            "user_id": current_user["username"],
                            "report_id": report_id,
                            "metric_name": flag["item"],
                            "value": flag["value"],
                            "unit": flag["unit"],
                            "timestamp": report_data["timestamp"]
                        }
                        db["metrics"].create_item(body=metric_doc)
        else:
            # Guest mode: local history.json
            history = load_json(HISTORY_FILE)
            history.insert(0, report_data)
            save_json(HISTORY_FILE, history[:50])

        return JSONResponse(content={"status": "success", **report_data})

    except Exception as e:
        print(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-prescription")
async def parse_prescription(
    file: UploadFile = File(...), 
    language: str = Form(...),
    current_user: dict = Depends(get_current_user_optional)
):
    if not os.getenv("AZURE_OPENAI_KEY") or not os.getenv("AZURE_DOC_INTEL_KEY") or not os.getenv("AZURE_SPEECH_KEY"):
        raise HTTPException(status_code=500, detail="Azure credentials are not configured properly.")

    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    try:
        ocr_text = extract_prescription_text(file_content)
        
        translated_text = translate_and_simplify(ocr_text, language)
        
        audio_bytes = generate_audio(translated_text, language)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8') if audio_bytes else None

        response_data = {
            "status": "success",
            "ocr_text": ocr_text,
            "translated_text": translated_text,
            "audio_base64": audio_base64,
            "language": language
        }
        
        report_id = str(uuid.uuid4())
        record_data = {
            "id": report_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "filename": file.filename,
            "type": "prescription",
            "language": language,
            "translated_text": translated_text
        }

        if current_user:
            db = get_db()
            if db.get("prescriptions"):
                record_data["user_id"] = current_user["username"]
                db["prescriptions"].create_item(body=record_data)
        else:
            history = load_json(HISTORY_FILE)
            history.insert(0, record_data)
            save_json(HISTORY_FILE, history[:50])

        return JSONResponse(content=response_data)

    except Exception as e:
        print(f"Prescription parsing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(current_user: dict = Depends(get_current_user_optional)):
    if current_user:
        db = get_db()
        history = []
        if db.get("reports"):
            query = "SELECT * FROM c WHERE c.user_id=@user_id ORDER BY c.timestamp DESC"
            params = [{"name": "@user_id", "value": current_user["username"]}]
            reports = list(db["reports"].query_items(query=query, parameters=params, enable_cross_partition_query=True))
            for r in reports:
                r["type"] = "report"
                history.append(r)
        
        if db.get("prescriptions"):
            query = "SELECT * FROM c WHERE c.user_id=@user_id ORDER BY c.timestamp DESC"
            params = [{"name": "@user_id", "value": current_user["username"]}]
            prescriptions = list(db["prescriptions"].query_items(query=query, parameters=params, enable_cross_partition_query=True))
            for p in prescriptions:
                p["type"] = "prescription"
                history.append(p)
                
        history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return history
    else:
        # Guest mode read local file
        return load_json(HISTORY_FILE)

@app.get("/api/settings")
async def get_settings():
    return load_json(SETTINGS_FILE, default={"theme": "light", "notifications": True})

@app.post("/api/settings")
async def update_settings(settings: dict):
    save_json(SETTINGS_FILE, settings)
    return {"status": "success"}

@app.get("/api/trends")
async def get_trends(current_user: dict = Depends(get_current_user)):
    """Wow Factor 1: Fetch historical lab metrics for charting."""
    db = get_db()
    if not db.get("metrics"):
        raise HTTPException(status_code=500, detail="Database not configured")
        
    query = "SELECT * FROM c WHERE c.user_id=@user_id ORDER BY c.timestamp ASC"
    params = [{"name": "@user_id", "value": current_user["username"]}]
    metrics = list(db["metrics"].query_items(query=query, parameters=params, enable_cross_partition_query=True))
    
    # Group by metric_name
    trends = {}
    for m in metrics:
        name = m["metric_name"]
        if name not in trends:
            trends[name] = {"dates": [], "values": [], "unit": m["unit"]}
        trends[name]["dates"].append(m["timestamp"])
        trends[name]["values"].append(m["value"])
        
    return trends

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
