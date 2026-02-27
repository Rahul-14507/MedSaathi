import os
import json
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

def evaluate_patient_response(patient_response):
    """
    Uses Azure OpenAI to analyze a patient's natural language response.
    Extracts pain level and flags any potential complications.
    Returns a dictionary with the structured evaluation.
    """
    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        api_version="2024-02-01",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
    )
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

    prompt = f"""
    You are an AI tasked with evaluating a patient's post-surgery check-in response.
    
    Patient Response: "{patient_response}"
    
    Analyze the response and extract the following information. Return ONLY a valid JSON object with these exact keys:
    - "pain_level": An integer from 1 to 10. If not explicitly stated, estimate based on the language (e.g. "it hurts a little" = 3, "agony" = 9). If completely unable to infer, use 0.
    - "symptoms_flagged": A short string listing any concerning symptoms mentioned (e.g., "fever, swelling, excessive bleeding, redness"). If none, return "None".
    - "requires_alert": A boolean. Set to true ONLY IF:
        1. The pain level is 7 or higher.
        2. The patient explicitly mentions signs of infection or complications (fever, pus, severe swelling, uncontrolled bleeding).
        Otherwise, set to false.
        
    Ensure the output is raw JSON without markdown formatting.
    """

    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are a medical triage parsing system. You output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean up markdown if the LLM hallucinated it despite instructions
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
        evaluation = json.loads(content)
        return evaluation
        
    except Exception as e:
        print(f"Error evaluating patient response: {e}")
        # Fail safe fallback
        return {
            "pain_level": 0,
            "symptoms_flagged": "Error parsing response.",
            "requires_alert": True # Default to alert if the system fails to parse a message to be safe
        }

if __name__ == "__main__":
    # Test the analyzer
    test_response = "My knee really hurts today, I'd say an 8. Also it feels very hot and red."
    result = evaluate_patient_response(test_response)
    print(f"Test Input: {test_response}")
    print(f"Evaluation: {json.dumps(result, indent=2)}")
