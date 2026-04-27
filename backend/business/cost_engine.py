import psycopg2
import os

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/fraud_detection')

class CostEngine:
    def __init__(self, investigation_cost=50, friction_cost=10):
        self.investigation_cost = investigation_cost
        self.friction_cost = friction_cost

    def calculate_impact(self):
        conn = psycopg2.connect(POSTGRES_URL)
        try:
            with conn.cursor() as cur:
                # 1. Fraud Prevented (sum of 'Amount' in confirmed fraud that were blocked/reviewed)
                # Note: 'features' contains 'Amount'
                cur.execute("""
                    SELECT SUM((features->>'Amount')::float) 
                    FROM fraud_logs 
                    WHERE state = 'Confirmed Fraud'
                """)
                fraud_prevented = cur.fetchone()[0] or 0.0

                # 2. False Positive Count
                cur.execute("SELECT COUNT(*) FROM fraud_logs WHERE state = 'False Positive'")
                fp_count = cur.fetchone()[0] or 0
                fp_cost = fp_count * self.investigation_cost

                # 3. Customer Friction Count (Transactions sent to review or blocked mistakenly)
                # We categorize 'Under Review' as friction
                cur.execute("SELECT COUNT(*) FROM fraud_logs WHERE state = 'Under Review'")
                review_count = cur.fetchone()[0] or 0
                friction_cost_total = review_count * self.friction_cost

                net_savings = fraud_prevented - fp_cost - friction_cost_total

                return {
                    "fraud_prevented": float(fraud_prevented),
                    "false_positive_cost": float(fp_cost),
                    "customer_friction_cost": float(friction_cost_total),
                    "net_savings": float(net_savings),
                    "currency": "INR", # As per user request₹
                    "metrics": {
                        "fp_count": fp_count,
                        "review_queue_size": review_count
                    }
                }
        finally:
            conn.close()
