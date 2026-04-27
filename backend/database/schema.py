import psycopg2
import os

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@postgres:5432/fraud_detection')

def initialize_database():
    conn = psycopg2.connect(POSTGRES_URL)
    with conn.cursor() as cur:
        # 1. Update/Create fraud_logs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS fraud_logs (
                id SERIAL PRIMARY KEY,
                transaction_id TEXT UNIQUE,
                card_id TEXT,
                prediction INT,
                probability FLOAT,
                state TEXT DEFAULT 'Pending',
                feedback TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                features JSONB,
                model_version TEXT
            )
        """)
        
        # Ensure columns exist in case table was created previously
        columns_to_add = [
            ("transaction_id", "TEXT UNIQUE"),
            ("state", "TEXT DEFAULT 'Pending'"),
            ("feedback", "TEXT"),
            ("model_version", "TEXT")
        ]
        
        for col_name, col_type in columns_to_add:
            cur.execute(f"""
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='fraud_logs' AND column_name='{col_name}') THEN
                        ALTER TABLE fraud_logs ADD COLUMN {col_name} {col_type};
                    END IF;
                END $$;
            """)

        
        # 2. Add indices for performance
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fraud_logs_transaction_id ON fraud_logs(transaction_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fraud_logs_state ON fraud_logs(state)")

        # 3. Create model_versions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS model_versions (
                id SERIAL PRIMARY KEY,
                version_name TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                training_data_hash TEXT,
                baseline_auc FLOAT,
                baseline_recall FLOAT,
                drift_score_at_deploy FLOAT,
                is_active BOOLEAN DEFAULT FALSE
            )
        """)

        # 4. Create audit_logs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                action_type TEXT,
                transaction_id TEXT,
                model_version TEXT,
                user_role TEXT,
                previous_state TEXT,
                new_state TEXT,
                metadata JSONB
            )
        """)
        
        # 5. Create feedback_store for retraining
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedback_store (
                id SERIAL PRIMARY KEY,
                transaction_id TEXT REFERENCES fraud_logs(transaction_id),
                label INT, -- 1 for Fraud, 0 for Legitimate
                analyst_id TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 6. Create notifications table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                message TEXT NOT NULL,
                type TEXT NOT NULL, -- 'Info', 'Warning', 'Critical'
                is_read BOOLEAN DEFAULT FALSE,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 7. Create user_roles table for permissions management
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_roles (
                email TEXT PRIMARY KEY,
                name TEXT,
                role TEXT, -- 'Admin', 'Risk Analyst', 'Auditor'
                status TEXT DEFAULT 'Active', -- 'Active', 'Revoked'
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Seed initial users (Idempotent seed)
        initial_users = [
            ('shreshta0611@gmail.com', 'shreshta0611', 'Admin'),
            ('nischayagarg008@gmail.com', 'nischayagarg008', 'Auditor'),
            ('ansh72126@gmail.com', 'ansh72126', 'Risk Analyst')
        ]
        
        for email, name, role in initial_users:
            cur.execute("""
                INSERT INTO user_roles (email, name, role)
                SELECT %s, %s, %s
                WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE email = %s)
            """, (email, name, role, email))

        conn.commit()
    conn.close()
    print("Database schema initialized successfully.")

if __name__ == "__main__":
    initialize_database()
