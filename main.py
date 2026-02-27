from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import io
from dotenv import load_dotenv

from extractor import extract_text_from_file
from analyzer import load_benchmarks, flag_values, generate_human_friendly_report

import datetime
import uuid
import json

load_dotenv()

app = FastAPI(title="Lab Report Intelligence API")

# Ensure data and static directories exist
os.makedirs("data", exist_ok=True)
os.makedirs("static", exist_ok=True)

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
async def analyze_report(file: UploadFile = File(...)):
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

        # Save to history
        history = load_json(HISTORY_FILE)
        history.insert(0, report_data)  # Add to top
        save_json(HISTORY_FILE, history[:50]) # Keep last 50

        return JSONResponse(content={"status": "success", **report_data})

    except Exception as e:
        print(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history():
    return load_json(HISTORY_FILE)

@app.get("/api/settings")
async def get_settings():
    return load_json(SETTINGS_FILE, default={"theme": "light", "notifications": True})

@app.post("/api/settings")
async def update_settings(settings: dict):
    save_json(SETTINGS_FILE, settings)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
