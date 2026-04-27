import psycopg2
import json
import os
from datetime import datetime
from .state_machine import TransactionState

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/fraud_detection')

class AuditManager:
    def __init__(self, db_conn=None):
        self.db_conn = db_conn
        self._owned_conn = False
        if self.db_conn is None:
            self.db_conn = psycopg2.connect(POSTGRES_URL)
            self._owned_conn = True

    def log_event(self, action_type, transaction_id=None, model_version=None, 
                  user_role=None, previous_state=None, new_state=None, metadata=None):
        try:
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO audit_logs 
                    (action_type, transaction_id, model_version, user_role, previous_state, new_state, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    action_type,
                    transaction_id,
                    model_version,
                    user_role,
                    str(previous_state) if previous_state else None,
                    str(new_state) if new_state else None,
                    json.dumps(metadata) if metadata else None
                ))
                self.db_conn.commit()
        except Exception as e:
            print(f"Failed to log audit event: {e}")
            self.db_conn.rollback()

    def clear_logs(self):
        try:
            with self.db_conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE audit_logs")
                self.db_conn.commit()
            return True, "Audit logs cleared successfully."
        except Exception as e:
            self.db_conn.rollback()
            return False, f"Failed to clear audit logs: {str(e)}"

    def close(self):
        if self._owned_conn and self.db_conn:
            self.db_conn.close()

# Singleton-ready if needed inside main
