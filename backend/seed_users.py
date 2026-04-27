import psycopg2
import os

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/fraud_detection')

def seed_users():
    # Attempt to connect to localhost first (for local run) or the docker name
    try:
        conn = psycopg2.connect(POSTGRES_URL)
    except:
        # Fallback for inside docker or different env
        conn = psycopg2.connect("postgresql://postgres:password@postgres:5432/fraud_detection")

    with conn.cursor() as cur:
        print("Pre-registering team members in Governance Registry...")
        
        users = [
            ('shreshta0611@gmail.com', 'Shreshta', 'Admin'),
            ('ansh72126@gmail.com', 'Ansh', 'Risk Analyst'),
            ('nischayagarg008@gmail.com', 'Nischaya', 'Auditor')
        ]
        
        for email, name, role in users:
            cur.execute("""
                INSERT INTO user_roles (email, name, role, status, added_by)
                VALUES (%s, %s, %s, 'Active', 'System Governance')
                ON CONFLICT (email) DO UPDATE 
                SET role = EXCLUDED.role, status = 'Active', name = EXCLUDED.name, added_by = 'System Governance'
            """, (email.lower(), name, role))
            print(f" - Registered: {email} as {role}")
            
        conn.commit()
    conn.close()
    print("Governance Registry Seeding successfully complete.")

if __name__ == "__main__":
    seed_users()
