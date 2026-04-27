import pytest
from fastapi.testclient import TestClient
from inference.main import app
import json
import time

client = TestClient(app)

def test_full_pipeline_flow():
    """
    Integration test for the full Prediction -> Review -> Retrain lifecycle.
    """
    # 1. Trigger an inference that might be suspicious
    card_id = "test_card_123"
    # We assume Redis is seeded with some features for this card
    # If not, this might fail, so we might need to mock Redis in a real CI environment
    
    # Let's mock a prediction result by interacting with the DB if needed, 
    # but here we test the API endpoints.
    
    # 2. Check Review Queue
    response = client.get("/review/queue")
    assert response.status_code == 200
    initial_queue = response.json()
    
    # 3. Resolve a transaction (if any exists)
    if initial_queue:
        tx_id = initial_queue[0]["transaction_id"]
        resolve_resp = client.post("/review/resolve", json={
            "transaction_id": tx_id,
            "feedback": "Confirmed Fraud",
            "user_role": "Risk Analyst"
        })
        assert resolve_resp.status_code == 200
        
    # 4. Trigger Retraining
    retrain_resp = client.post("/models/retrain")
    assert retrain_resp.status_code == 200
    retrain_result = retrain_resp.json()
    
    if retrain_result["status"] == "success":
        assert "version" in retrain_result
        assert "reconciled_items" in retrain_result.get("metrics", {}) or "reconciled_items" in str(retrain_result)
        # Note: Depending on how the notification is structured, we check for 'reconciled'
        
    # 5. Check Notifications
    notif_resp = client.get("/notifications")
    assert notif_resp.status_code == 200
    assert any("Retrained Successfully" in n["message"] for n in notif_resp.json())

def test_monitoring_state():
    response = client.get("/monitoring/state")
    assert response.status_code == 200
    data = response.json()
    assert "financial_impact" in data
    assert "review_queue_size" in data
