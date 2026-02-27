import os
from azure.cosmos import CosmosClient, PartitionKey
from dotenv import load_dotenv

load_dotenv()

COSMOS_ENDPOINT = os.getenv("AZURE_COSMOS_ENDPOINT")
COSMOS_KEY = os.getenv("AZURE_COSMOS_KEY")
DATABASE_NAME = "MedSaathiDB"

# Initialize Cosmos Client
client = None
database = None
users_container = None
reports_container = None
metrics_container = None
prescriptions_container = None

import uuid

class MockContainer:
    def __init__(self):
        self.items = []
        
    def query_items(self, query, parameters=None, enable_cross_partition_query=False):
        # Extremely basic mock query logic just for local testing the auth flows
        if not parameters: return self.items
        
        results = []
        for item in self.items:
            match = True
            for param in parameters:
                key = param["name"].replace("@", "")
                val = param["value"]
                if item.get(key) != val and item.get("id") != val and item.get("user_id") != val and item.get("username") != val:
                    match = False
                    break
            if match:
                results.append(item)
        return results
        
    def create_item(self, body):
        if "id" not in body:
            body["id"] = str(uuid.uuid4())
        self.items.append(body)
        return body

if COSMOS_ENDPOINT and COSMOS_KEY:
    try:
        client = CosmosClient(url=COSMOS_ENDPOINT, credential=COSMOS_KEY)
        database = client.create_database_if_not_exists(id=DATABASE_NAME)
        
        users_container = database.create_container_if_not_exists(id="Users", partition_key=PartitionKey(path="/id"))
        reports_container = database.create_container_if_not_exists(id="LabReports", partition_key=PartitionKey(path="/user_id"))
        metrics_container = database.create_container_if_not_exists(id="LabMetrics", partition_key=PartitionKey(path="/user_id"))
        prescriptions_container = database.create_container_if_not_exists(id="Prescriptions", partition_key=PartitionKey(path="/user_id"))
        print("Successfully connected to Azure Cosmos DB and initialized containers.")
    except Exception as e:
        print(f"Error initializing Cosmos DB: {e}")
        users_container = MockContainer()
        reports_container = MockContainer()
        metrics_container = MockContainer()
        prescriptions_container = MockContainer()
else:
    print("Warning: Cosmos DB credentials missing. Falling back to Mock in-memory containers.")
    users_container = MockContainer()
    reports_container = MockContainer()
    metrics_container = MockContainer()
    prescriptions_container = MockContainer()

def get_db():
    """Returns the container references for the application."""
    return {
        "users": users_container,
        "reports": reports_container,
        "metrics": metrics_container,
        "prescriptions": prescriptions_container
    }
