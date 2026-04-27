import psycopg2
import os
import json
import uuid
import random
from datetime import datetime, timedelta

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@postgres:5432/fraud_detection')

def seed_data():
    conn = psycopg2.connect(POSTGRES_URL)
    with conn.cursor() as cur:
        print("Seeding mock transaction logs...")
        
        # Create 20 mock transactions
        for i in range(20):
            tx_id = f"seed_tx_{uuid.uuid4().hex[:8]}"
            card_id = f"4532-xxxx-xxxx-{random.randint(1000, 9999)}"
            prob = random.uniform(0.1, 0.9)
            state = "Resolved" if i < 15 else "Pending"
            
            # Generate 29 feature values
            features = {f"V{i}": random.uniform(-2, 2) for i in range(1, 29)}
            features["Amount"] = random.uniform(10, 500)
            
            cur.execute("""
                INSERT INTO fraud_logs 
                (transaction_id, card_id, probability, state, features, model_version, prediction) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (transaction_id) DO NOTHING
            """, (tx_id, card_id, prob, state, json.dumps(features), "v1_stable", 1 if prob > 0.5 else 0))
            
            # If it's a "Resolved" transaction, add human feedback
            if i < 15:
                label = 1 if prob > 0.6 else 0 # Mock "ground truth"
                cur.execute("""
                    INSERT INTO feedback_store (transaction_id, label, analyst_id)
                    VALUES (%s, %s, %s)
                """, (tx_id, label, "Admin_Seeder"))
        
        conn.commit()
    conn.close()
    print("Seeding complete. 20 Transactions added, 15 Feedback entries created.")

if __name__ == "__main__":
    seed_data()
