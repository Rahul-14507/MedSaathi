# 🏥 MedSaathi — Lab Report Intelligence Platform

> AI-powered medical intelligence that turns complex lab reports and handwritten prescriptions into plain-language summaries patients can understand — with vernacular audio, real-time doctor messaging, and autonomous post-surgery follow-up.

---

## ✨ Features

| Module | Capability |
|---|---|
| **Lab Report Analyzer** | Upload PDF → Azure Doc Intelligence extracts tables → GPT-4o generates empathetic summary → Abnormal values flagged against benchmarks |
| **Prescription Parser** | Handwritten prescription OCR → Hindi/Telugu translation → Azure TTS audio playback |
| **Health Trends** | Longitudinal tracking of lab metrics (Glucose, HbA1c, etc.) with interactive charts |
| **MediConnect Portal** | Role-based hospital dashboards (Doctor, Nurse, Admin, Pharmacy, Lab, Super Admin) |
| **Universal Barcode** | Unique patient ID scannable by any hospital, lab, or pharmacy in the network |
| **Emergency Escalation** | Nurses flag critical patients → instant doctor notification via WebSockets |
| **Patient-Doctor Messaging** | Real-time chat between patients and assigned doctors across portals |
| **Follow-up Agent** | Autonomous post-surgery SMS/WhatsApp check-ins → GPT-4o triage → auto-alerts |
| **One-Click Transfer** | Full medical history migration to another registered hospital |

---

## 📁 Project Structure

```
MedSaathi/
├── app/                            # Python backend package
│   ├── main.py                     # FastAPI app entry point
│   ├── intelligence/               # AI Intelligence Engine
│   │   ├── analyzer.py             # GPT-4o report analysis + benchmark flagging
│   │   ├── extractor.py            # Azure Document Intelligence OCR
│   │   ├── speech.py               # Azure Cognitive Services TTS
│   │   └── benchmarks.json         # Medical reference ranges
│   ├── mediconnect/                # Hospital Management System
│   │   ├── api.py                  # HMS REST API routes + WebSockets
│   │   ├── database.py             # SQLite schema + query functions
│   │   └── seed.py                 # Demo data seeder
│   ├── followup/                   # Autonomous Follow-up Agent
│   │   ├── analyzer.py             # GPT-4o patient response triage
│   │   ├── database.py             # SQLite for check-in tracking
│   │   └── twilio.py               # Twilio SMS/WhatsApp client
│   └── auth/                       # Authentication
│       ├── routes.py               # JWT login/register endpoints
│       └── cosmos.py               # Azure Cosmos DB connector
│
├── frontend/                       # React staff portal (Vite + Tailwind)
│   └── src/
│       ├── pages/                  # Doctor, Nurse, Admin dashboards
│       ├── components/             # Shared UI components (shadcn/ui)
│       └── hooks/                  # Auth, toast hooks
│
├── static/                         # Patient portal (Vanilla HTML/CSS/JS)
│   ├── index.html                  # MedSaathi landing page
│   ├── style.css                   # Design system
│   ├── app.js                      # Client-side logic
│   └── portal/                     # Built React portal assets
│
├── data/                           # Runtime data (gitignored)
│   ├── mediconnect.db              # HMS SQLite database
│   ├── followup.db                 # Follow-up agent database
│   ├── history.json                # Guest mode analysis history
│   └── settings.json               # User preferences
│
├── shared/                         # Shared TypeScript schemas
├── .env                            # Environment variables (see below)
├── requirements.txt                # Python dependencies
├── package.json                    # Node.js dependencies
├── vite.config.ts                  # Vite build configuration
└── tailwind.config.js              # Tailwind CSS configuration
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Azure account with OpenAI, Document Intelligence, Speech, and Cosmos DB services

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/MedSaathi.git
cd MedSaathi

# Python dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Node dependencies (for React portal)
npm install
```

### 2. Configure Environment

Create a `.env` file with:

```env
AZURE_OPENAI_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

AZURE_DOC_INTEL_KEY=your_key
AZURE_DOC_INTEL_ENDPOINT=https://your-resource.cognitiveservices.azure.com/

AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=eastus

AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your_key

JWT_SECRET_KEY=your_secret
```

### 3. Initialize & Seed Database

```bash
python -c "from app.mediconnect.database import init_db; init_db()"
python -m app.mediconnect.seed
```

### 4. Build React Portal

```bash
npx vite build
```

### 5. Run

```bash
python -m uvicorn app.main:app --port 8000 --reload
```

Open:
- **Patient Portal**: [http://localhost:8000](http://localhost:8000)
- **Staff Portal**: [http://localhost:8000/portal/](http://localhost:8000/portal/)

### Demo Credentials

| Role | Org Code | Employee ID | Password |
|---|---|---|---|
| Doctor | CITY | DOC001 | password |
| Nurse | CITY | NUR001 | password |
| Admin | CITY | ADM001 | password |
| Patient (MedSaathi) | — | PAT-125948 | password |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| AI/ML | Azure OpenAI (GPT-4o), Azure Document Intelligence |
| Speech | Azure Cognitive Services TTS |
| Database | Azure Cosmos DB, SQLite |
| Frontend (Patient) | Vanilla HTML/CSS/JS, Chart.js |
| Frontend (Staff) | React, Vite, Tailwind CSS, shadcn/ui |
| Communication | Twilio SMS/WhatsApp, WebSockets |

---

## 📄 License

MIT
