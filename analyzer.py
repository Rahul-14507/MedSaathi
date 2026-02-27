import os
import json
import re
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

def load_benchmarks():
    with open("benchmarks.json", "r") as f:
        return json.load(f)

def flag_values(extracted_text, benchmarks):
    """
    Scans the extracted text for benchmarked medical parameters and flags values outside the normal range.
    """
    flags = []
    # Combine all text for easier searching
    all_text = " ".join(extracted_text.get("text_lines", []))
    for table in extracted_text.get("tables", []):
        for row in table:
            all_text += " " + " ".join(row)

    for item, info in benchmarks.items():
        # Simple regex to find the item and a following number
        # Note: In a real scenario, this might need more robust parsing (e.g., table structure awareness)
        pattern = re.compile(rf"{item}[:\s]*(\d+\.?\d*)", re.IGNORECASE)
        matches = pattern.findall(all_text)
        
        for match in matches:
            value = float(match)
            low, high = info["range"]
            if value < low or value > high:
                status = "LOW" if value < low else "HIGH"
                flags.append({
                    "item": item,
                    "value": value,
                    "unit": info["unit"],
                    "range": info["range"],
                    "status": status,
                    "description": info["description"]
                })
    return flags

def generate_human_friendly_report(extracted_text, flagged_data):
    """
    Generates a summary using Azure OpenAI GPT-4o.
    """
    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        api_version="2024-02-01",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
    )

    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

    # Combine text for the prompt
    full_text = "\n".join(extracted_text.get("text_lines", []))
    for i, table in enumerate(extracted_text.get("tables", [])):
        full_text += f"\nTable {i+1}:\n"
        for row in table:
            full_text += " | ".join(row) + "\n"

    prompt = f"""
You are a Medical Intelligence Assistant. Analyze the following lab report data and the flagged abnormalities.
Generate a 'Human-Friendly Report' with three clear sections:
1. **Status**: A quick overview of the health status based on these results.
2. **Simple Explanation**: Explain what the flagged values mean in plain English.
3. **Action Items**: Recommended next steps or questions for the user to ask their doctor.

**Extracted Raw Data:**
{full_text}

**Flagged Abnormalities:**
{json.dumps(flagged_data, indent=2)}

Please ensure the tone is professional yet empathetic and easy to understand for a non-medical person.
"""

    response = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {"role": "system", "content": "You are a helpful medical report analyzer."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )

    return response.choices[0].message.content

def translate_and_simplify(raw_text, target_language):
    """
    Translates and simplifies prescription text into the target language (Hindi or Telugu) 
    using Azure OpenAI, maintaining an empathetic tone.
    """
    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        api_version="2024-02-01",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
    )
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

    prompt = f"""
You are an empathetic, highly skilled bilingual medical assistant.
Your task is to review the following OCR-extracted text from a doctor's prescription and translate it into clear, simple {target_language}.

Instructions:
1. Identify all medication names and their prescribed dosages. If the doctor used abbreviations or shorthand for a medicine (e.g. "Do" instead of "Dolo 650", "Para" instead of "Paracetamol"), infer and write out the FULL, correct medicine name based on your medical knowledge.
2. Convert medical shorthand (e.g., '1-0-1', 'BD', 'TID') into simple vernacular instructions (e.g., 'Take one in the morning, zero in the afternoon, one at night').
3. Ignore random noise, clinic headers, or doctor credentials unless relevant to the patient's immediate care.
4. Maintain a supportive, empathetic, and calming tone to reduce patient anxiety.
5. Provide the output as pure text suitable for Text-to-Speech (TTS) reading. DO NOT use any markdown formatting characters under any circumstances (such as **, *, --, or #). Keep it conversational but structured in plain text only.

**Extracted Prescription Text:**
{raw_text}
"""
    response = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {"role": "system", "content": f"You are a helpful medical assistant speaking in {target_language}."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    # Test loading
    benchmarks = load_benchmarks()
    # print(json.dumps(benchmarks, indent=2))
