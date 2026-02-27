import os
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

def get_document_analysis_client():
    endpoint = os.getenv("AZURE_DOC_INTEL_ENDPOINT")
    key = os.getenv("AZURE_DOC_INTEL_KEY")
    if not endpoint or not key:
        raise ValueError("Azure Document Intelligence credentials not found in environment variables.")
    return DocumentAnalysisClient(endpoint, AzureKeyCredential(key))

def extract_text_from_file(file_content):
    """
    Extracts text and table content from a file using Azure AI Document Intelligence.
    """
    client = get_document_analysis_client()
    
    # Use prebuilt-layout model as requested
    poller = client.begin_analyze_document("prebuilt-layout", document=file_content)
    result = poller.result()

    extracted_data = {
        "text_lines": [],
        "tables": []
    }

    # Extract all text lines
    for page in result.pages:
        for line in page.lines:
            extracted_data["text_lines"].append(line.content)

    # Extract all table content
    for table in result.tables:
        table_data = []
        for row_idx in range(table.row_count):
            row = []
            for col_idx in range(table.column_count):
                cell = next((c for c in table.cells if c.row_index == row_idx and c.column_index == col_idx), None)
                if cell:
                    row.append(cell.content)
                else:
                    row.append("")
            table_data.append(row)
        extracted_data["tables"].append(table_data)

    return extracted_data

def extract_prescription_text(file_content):
    """
    Extracts handwritten text from a prescription using Azure AI Document Intelligence (prebuilt-read).
    """
    client = get_document_analysis_client()
    
    # Use prebuilt-read for capturing handwritten text
    poller = client.begin_analyze_document("prebuilt-read", document=file_content)
    result = poller.result()

    extracted_lines = []
    for page in result.pages:
        for line in page.lines:
            extracted_lines.append(line.content)

    return "\n".join(extracted_lines)

if __name__ == "__main__":
    pass
