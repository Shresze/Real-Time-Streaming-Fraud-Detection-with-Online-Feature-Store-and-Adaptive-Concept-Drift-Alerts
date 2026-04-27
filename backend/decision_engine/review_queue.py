import psycopg2
import json
import os
from datetime import datetime
from .state_machine import TransactionState, StateMachine
from .audit_manager import AuditManager

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/fraud_detection')

class ReviewQueue:
    def __init__(self, db_conn=None, audit_manager=None):
        self.db_conn = db_conn
        self.audit_manager = audit_manager
        self._owned_conn = False
        if self.db_conn is None:
            self.db_conn = psycopg2.connect(POSTGRES_URL)
            self._owned_conn = True

    def get_pending_reviews(self):
        conn = self.db_conn
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT transaction_id, card_id, probability, timestamp, features 
                    FROM fraud_logs 
                    WHERE state = %s 
                    ORDER BY timestamp DESC
                """, (TransactionState.UNDER_REVIEW.value,))
                rows = cur.fetchall()
                return [{
                    "transaction_id": r[0],
                    "card_id": r[1],
                    "probability": r[2],
                    "timestamp": r[3].isoformat(),
                    "features": r[4]
                } for r in rows]
        except Exception as e:
            print(f"Error fetching reviews: {e}")
            return []

    def resolve_transaction(self, transaction_id, feedback, analyst_id="analyst_1"):
        """
        feedback can be: 'Confirmed Fraud', 'False Positive', 'Legitimate'
        """
        # Map feedback to state
        if feedback == 'Confirmed Fraud':
            new_state = TransactionState.CONFIRMED_FRAUD
            label = 1
        elif feedback == 'False Positive':
            new_state = TransactionState.FALSE_POSITIVE
            label = 0
        else: # Legitimate
            new_state = TransactionState.APPROVED
            label = 0

        conn = self.db_conn
        try:
            with conn.cursor() as cur:
                # 1. Get current state
                cur.execute("SELECT state, model_version FROM fraud_logs WHERE transaction_id = %s", (transaction_id,))
                row = cur.fetchone()
                if not row:
                    return False, "Transaction not found"
                
                current_state_str, model_version = row
                current_state = TransactionState(current_state_str)

                # 2. Update state in logs
                cur.execute(
                    "UPDATE fraud_logs SET state = %s, feedback = %s WHERE transaction_id = %s",
                    (new_state.value, feedback, transaction_id)
                )

                # 3. Store feedback for retraining
                cur.execute(
                    "INSERT INTO feedback_store (transaction_id, label, analyst_id) VALUES (%s, %s, %s)",
                    (transaction_id, label, analyst_id)
                )

                # 4. Audit Log
                if self.audit_manager:
                    self.audit_manager.log_event(
                        action_type="HUMAN_REVIEW_RESOLVED",
                        transaction_id=transaction_id,
                        model_version=model_version,
                        user_role="Risk Analyst",
                        previous_state=current_state,
                        new_state=new_state,
                        metadata={"feedback": feedback, "analyst": analyst_id}
                    )

                conn.commit()
                return True, f"Transaction {transaction_id} resolved as {feedback}"
        except Exception as e:
            conn.rollback()
            return False, str(e)

    def reconcile_with_model(self, model, feature_names, version):
        """
        Re-evaluates items in the review queue with a new model.
        Auto-resolves items if the model is extremely certain.
        """
        import pandas as pd
        pending = self.get_pending_reviews()
        if not pending:
            return 0
        
        reconciled_count = 0
        conn = self.db_conn
        try:
            with conn.cursor() as cur:
                for item in pending:
                    features = item["features"]
                    tx_id = item["transaction_id"]
                    
                    # Align features
                    input_data = [features.get(f, 0) for f in feature_names]
                    df_input = pd.DataFrame([input_data], columns=feature_names)
                    prob = float(model.predict_proba(df_input)[0][1])

                    # Logic: 
                    # If prob < 0.1, it's likely a False Positive/Legitimate (Auto-approve)
                    # If prob > 0.9, it's likely a Confirmed Fraud (Auto-confirm)
                    # Otherwise, just update the probability in the queue for the analyst
                    
                    new_state = None
                    feedback = None
                    if prob < 0.1:
                        new_state = TransactionState.APPROVED
                        feedback = "System Auto-Approved (Post-Retrain)"
                    elif prob > 0.9:
                        new_state = TransactionState.CONFIRMED_FRAUD
                        feedback = "System Auto-Confirmed Fraud (Post-Retrain)"
                    
                    if new_state:
                        cur.execute(
                            "UPDATE fraud_logs SET state = %s, feedback = %s, probability = %s, model_version = %s WHERE transaction_id = %s",
                            (new_state.value, feedback, prob, version, tx_id)
                        )
                        if self.audit_manager:
                            self.audit_manager.log_event(
                                action_type="SYSTEM_AUTO_RECONCILE",
                                transaction_id=tx_id,
                                model_version=version,
                                user_role="System",
                                new_state=new_state,
                                metadata={"probability": prob, "reason": "High confidence after retraining"}
                            )
                        reconciled_count += 1
                    else:
                        # Just update probability and version to show latest model view
                        cur.execute(
                            "UPDATE fraud_logs SET probability = %s, model_version = %s WHERE transaction_id = %s",
                            (prob, version, tx_id)
                        )

                conn.commit()
                return reconciled_count
        except Exception as e:
            conn.rollback()
            print(f"Reconciliation error: {e}")
            return 0

    def close(self):
        if self._owned_conn and self.db_conn:
            self.db_conn.close()
