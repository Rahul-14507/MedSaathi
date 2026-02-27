# MedSaathi: Lab Report Intelligence Agent 🩺

A high-performance, web-native application designed to analyze medical lab reports. It uses Azure AI Document Intelligence for extraction and Azure OpenAI (GPT-4o) to generate human-friendly health summaries.

## Features

- **Dynamic Extraction**: Parses PDFs and images using Azure's `prebuilt-layout` model.
- **Smart Flagging**: Cross-references results against customizable medical benchmarks (Hemoglobin, Glucose, Cholesterol).
- **AI-Powered Insights**: Generates empathetic, easy-to-understand health summaries.
- **Persistent History**: Saves and retrieves previous analyses.
- **Premium UI**: Clean, responsive, and professional healthcare-themed interface.

## Local Setup Instructions

### Prerequisites

- Python 3.9 or higher
- An Azure Subscription with the following services deployed:
  - Azure AI Document Intelligence
  - Azure OpenAI (with GPT-4o model deployment)

### 1. Project Setup

```bash
# Clone the repository (or navigate to the directory)
cd MedSaathi

# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add your Azure credentials:

```env
AZURE_OPENAI_KEY=your_openai_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_DOC_INTEL_KEY=your_doc_intel_key_here
AZURE_DOC_INTEL_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
```

> [!TIP]
> You can use `.env.template` as a starting point.

### 4. Run the Application

Start the FastAPI backend server:

```bash
uvicorn main:app --port 8000 --reload
```

### 5. Access the UI

Open your web browser and navigate to:
**[http://localhost:8000/app/index.html](http://localhost:8000/app/index.html)**

---

## File Structure

- `main.py`: FastAPI backend and API endpoints.
- `extractor.py`: Azure AI Document Intelligence integration.
- `analyzer.py`: Flagging logic and Azure OpenAI integration.
- `benchmarks.json`: Medical range benchmarks.
- `static/`: Frontend assets (HTML, CSS, JS).
- `data/`: Local JSON storage for history and settings.
