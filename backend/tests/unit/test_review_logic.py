import pytest
from unittest.mock import MagicMock, patch
from decision_engine.review_queue import ReviewQueue
from decision_engine.state_machine import TransactionState
import pandas as pd
import numpy as np

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_audit():
    return MagicMock()

def test_resolve_transaction_confirmed_fraud(mock_db, mock_audit):
    queue = ReviewQueue(db_conn=mock_db, audit_manager=mock_audit)
    
    # Setup mock cursor
    mock_cursor = mock_db.cursor.return_value.__enter__.return_value
    mock_cursor.fetchone.return_value = (TransactionState.UNDER_REVIEW.value, "v1")
    
    success, msg = queue.resolve_transaction("tx_123", "Confirmed Fraud")
    
    assert success is True
    assert "resolved as Confirmed Fraud" in msg
    # Verify DB calls
    mock_cursor.execute.assert_any_call(
        "UPDATE fraud_logs SET state = %s, feedback = %s WHERE transaction_id = %s",
        (TransactionState.CONFIRMED_FRAUD.value, "Confirmed Fraud", "tx_123")
    )

def test_reconcile_with_model_auto_approve(mock_db, mock_audit):
    queue = ReviewQueue(db_conn=mock_db, audit_manager=mock_audit)
    
    # Mock items in queue
    queue.get_pending_reviews = MagicMock(return_value=[
        {"transaction_id": "tx_safe", "features": {"V1": 0.1, "Amount": 10}, "probability": 0.6}
    ])
    
    # Mock Model
    mock_model = MagicMock()
    # Predict low probability (Safe)
    mock_model.predict_proba.return_value = np.array([[0.95, 0.05]]) 
    
    reconciled = queue.reconcile_with_model(mock_model, ["V1", "Amount"], "v2_new")
    
    assert reconciled == 1
    mock_db.cursor.return_value.__enter__.return_value.execute.assert_any_call(
        "UPDATE fraud_logs SET state = %s, feedback = %s, probability = %s, model_version = %s WHERE transaction_id = %s",
        (TransactionState.APPROVED.value, "System Auto-Approved (Post-Retrain)", 0.05, "v2_new", "tx_safe")
    )

def test_reconcile_with_model_update_only(mock_db, mock_audit):
    queue = ReviewQueue(db_conn=mock_db, audit_manager=mock_audit)
    
    queue.get_pending_reviews = MagicMock(return_value=[
        {"transaction_id": "tx_unsure", "features": {"V1": 0.5, "Amount": 50}, "probability": 0.6}
    ])
    
    mock_model = MagicMock()
    # Predict medium probability (Unsure)
    mock_model.predict_proba.return_value = np.array([[0.6, 0.4]]) 
    
    reconciled = queue.reconcile_with_model(mock_model, ["V1", "Amount"], "v2_new")
    
    assert reconciled == 0 # Not auto-resolved because 0.4 is not <0.1 or >0.9
    mock_db.cursor.return_value.__enter__.return_value.execute.assert_any_call(
        "UPDATE fraud_logs SET probability = %s, model_version = %s WHERE transaction_id = %s",
        (0.4, "v2_new", "tx_unsure")
    )
