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

if __name__ == "__main__":
    # Test loading
    benchmarks = load_benchmarks()
    print(json.dumps(benchmarks, indent=2))
