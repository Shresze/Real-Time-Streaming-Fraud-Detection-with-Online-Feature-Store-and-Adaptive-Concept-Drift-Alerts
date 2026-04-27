from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os
import psycopg2
from datetime import datetime
import pandas as pd
import uuid

# Project Modules
from model_registry.registry import ModelRegistry
from decision_engine.policy import DecisionPolicy
from decision_engine.state_machine import StateMachine, TransactionState
from decision_engine.audit_manager import AuditManager
from decision_engine.review_queue import ReviewQueue
from business.cost_engine import CostEngine
from retraining.pipeline import RetrainPipeline
from monitoring.orchestrator import orchestrator

app = FastAPI(title="Fraud Risk Intelligence Platform API")

# CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def support_api_prefixed_routes(request: Request, call_next):
    """
    Normalize paths coming from the frontend reverse proxy.
    The dashboard calls `/api/...` while backend routes are defined as `/...`.
    """
    path = request.scope.get("path", "")
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]
    return await call_next(request)

# Configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/fraud_detection')

# Global objects
registry = ModelRegistry()
policy = DecisionPolicy()
audit = AuditManager()
review_queue = ReviewQueue(audit_manager=audit)
cost_engine = CostEngine()
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

@app.on_event("startup")
def startup_event():
    # Load Active Model
    success = registry.load_active_model()
    if not success:
        print("Warning: No active model found in registry.")

@app.post("/predict/{card_id}")
async def predict(card_id: str, request: Request):
    """
    Inference endpoint with idempotency and state machine integration.
    """
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    transaction_id = body.get("transaction_id")
    
    # 1. Idempotency Check
    if transaction_id:
        existing = get_transaction_from_db(transaction_id)
        if existing:
            return existing

    # 2. Fetch features from Redis
    features_raw = r.get(f"features:{card_id}")
    if not features_raw:
        raise HTTPException(status_code=404, detail="Features not found in Redis for this card_id")
    
    transaction_data = json.loads(features_raw)
    
    # 3. Model Inference
    if registry.active_model is None:
        raise HTTPException(status_code=500, detail="No model loaded in registry")
    
    try:
        # Align features
        input_data = [transaction_data[f] for f in registry.feature_names]
        df_input = pd.DataFrame([input_data], columns=registry.feature_names)
        prob = float(registry.active_model.predict_proba(df_input)[0][1])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {str(e)}")

    # 4. Decision Engine
    safeguard = orchestrator.get_state().get('adaptive_safeguard', False)
    decision_result = policy.evaluate(prob, transaction_id, safeguard_active=safeguard)
    tx_id = decision_result["transaction_id"]
    state = decision_result["decision"]

    # 5. Persist and Audit
    save_transaction_to_db(tx_id, card_id, prob, state, transaction_data, registry.active_version)
    audit.log_event(
        action_type="INFERENCE_COMPLETE",
        transaction_id=tx_id,
        model_version=registry.active_version,
        new_state=state,
        metadata={"probability": prob}
    )

    return {
        "transaction_id": tx_id,
        "card_id": card_id,
        "decision": state,
        "probability": prob,
        "reason": decision_result["reason"],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/monitoring/state")
def get_monitoring_state():
    state = orchestrator.get_state()
    financial = cost_engine.calculate_impact()
    
    # Enrich with project requirements
    state.update({
        "financial_impact": financial,
        "model_version": registry.active_version,
        "review_queue_size": financial["metrics"]["review_queue_size"],
        "sla_status": "Healthy" if state.get("latency_rolling", 0) < 200 else "Warning"
    })
    return state

@app.get("/models")
def list_models():
    return registry.get_all_versions()

@app.post("/models/switch")
def switch_model(payload: dict):
    version = payload.get("version")
    success, msg = registry.switch_model(version)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    
    audit.log_event(
        action_type="MODEL_SWITCH",
        model_version=version,
        user_role="Admin",
        metadata={"status": "Success"}
    )
    return {"status": "success", "message": msg}

@app.post("/models/retrain")
def trigger_retrain():
    # We use the baseline from orchestrator's data stream
    pipeline = RetrainPipeline(registry, orchestrator.data_stream.get_baseline())
    result = pipeline.run()
    
    if result["status"] == "success":
        # Auto-Deploy the new model version
        registry.switch_model(result["version"])
        
        # Reconciliation: Update the review queue based on the new model
        reconciled = review_queue.reconcile_with_model(
            registry.active_model, 
            registry.feature_names, 
            result["version"]
        )
        
        audit.log_event(
            action_type="MODEL_RETRAIN",
            model_version=result["version"],
            user_role="Admin",
            metadata={**result["metrics"], "reconciled_items": reconciled}
        )
        add_notification(
            message=f"Model Retrained Successfully: New Version {result['version']} Live. {reconciled} items automated in queue.",
            notif_type="Success"
        )
    else:
        audit.log_event(
            action_type="MODEL_RETRAIN_FAILED",
            user_role="Admin",
            metadata={"reason": result.get("message", "Unknown Error")}
        )
        add_notification(
            message=f"Model Retrain Failed: {result.get('message', 'System error')}",
            notif_type="Warning"
        )
    return result

@app.get("/review/queue")
def get_review_queue():
    return review_queue.get_pending_reviews()

@app.get("/audit/logs")
def get_audit_logs():
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT timestamp, action_type, transaction_id, model_version, user_role, previous_state, new_state, metadata 
                FROM audit_logs 
                ORDER BY timestamp DESC 
                LIMIT 50
            """)
            rows = cur.fetchall()
            return [
                {
                    "timestamp": r[0].isoformat(),
                    "action_type": r[1],
                    "transaction_id": r[2],
                    "model_version": r[3],
                    "user_role": r[4],
                    "previous_state": r[5],
                    "new_state": r[6],
                    "metadata": r[7]
                }
                for r in rows
            ]
    finally:
        conn.close()

@app.post("/audit/clear")
async def clear_audit_logs(payload: dict):
    # Security check: pattern username_end + Admin role required
    username = payload.get("username", "").lower()
    key = payload.get("key", "")
    role = payload.get("role", "")
    
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Governance violation: Only Admin role can clear system journal.")
    
    if not username or key != f"{username}_end":
        raise HTTPException(status_code=403, detail="Invalid security key for clearing journal.")

    success, msg = audit.clear_logs()
    if not success:
        raise HTTPException(status_code=500, detail=msg)
    
    # Log the clearing event itself (optional, but good practice)
    audit.log_event(
        action_type="JOURNAL_CLEARED",
        user_role="Admin",
        metadata={"triggered_by": username}
    )
    
    return {"status": "success", "message": msg}

# --- User Management & Rights Governance ---

@app.get("/admin/users")
async def get_team_members():
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT email, name, role, status, last_login, created_at, added_by, last_modified_by FROM user_roles ORDER BY created_at")
            rows = cur.fetchall()
            return [
                {
                    "email": r[0],
                    "name": r[1],
                    "role": r[2],
                    "status": r[3],
                    "last_login": r[4].isoformat() if r[4] else None,
                    "created_at": r[5].isoformat() if r[5] else None,
                    "added_by": r[6],
                    "last_modified_by": r[7]
                }
                for r in rows
            ]
    finally:
        conn.close()

@app.post("/admin/users/update")
async def update_user_rights(payload: dict):
    target_email = payload.get("email")
    new_role = payload.get("role")
    new_status = payload.get("status")
    admin_email = payload.get("admin_email", "System")
    
    # Immutable Admin Protection
    if target_email == "shreshta0611@gmail.com":
        raise HTTPException(status_code=403, detail="Governance Lock: Super Admin rights cannot be modified.")

    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE user_roles 
                SET role = COALESCE(%s, role), 
                    status = COALESCE(%s, status),
                    last_modified_by = %s
                WHERE LOWER(email) = LOWER(%s)
            """, (new_role, new_status, admin_email, target_email))
            
            # Audit the permission change
            audit.log_event(
                action_type="PERMISSION_CHANGE",
                user_role="Admin",
                metadata={
                    "target_user": target_email,
                    "new_role": new_role,
                    "new_status": new_status,
                    "adjusted_by": admin_email
                }
            )
            conn.commit()
            return {"status": "success", "message": f"Permissions updated for {target_email}"}
    finally:
        conn.close()

@app.post("/admin/users/add")
async def add_team_member(payload: dict):
    email = payload.get("email")
    name = payload.get("name")
    role = payload.get("role", "Auditor")
    admin_email = payload.get("admin_email", "System")

    if not email or not name:
        raise HTTPException(status_code=400, detail="Missing required fields: email and name")

    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            # Check if exists
            cur.execute("SELECT email FROM user_roles WHERE LOWER(email) = LOWER(%s)", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="User already exists in the registry.")

            cur.execute("""
                INSERT INTO user_roles (email, name, role, status, added_by)
                VALUES (%s, %s, %s, 'Active', %s)
            """, (email.lower(), name, role, admin_email))
            
            # Audit the invitation
            audit.log_event(
                action_type="USER_INVITED",
                user_role="Admin",
                metadata={
                    "new_member": email,
                    "assigned_role": role,
                    "invited_by": admin_email
                }
            )
            conn.commit()
            return {"status": "success", "message": f"Member {email} invited successfully."}
    finally:
        conn.close()

@app.get("/auth/profile/{email}")
async def get_user_profile(email: str):
    email_clean = email.strip().lower()
    
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT role, status FROM user_roles WHERE LOWER(email) = %s", (email_clean,))
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=403, detail="Identity Verification Failed: Your email is not registered in the system's authorized team list.")
            
            # Update last login
            cur.execute("UPDATE user_roles SET last_login = NOW() WHERE LOWER(email) = %s", (email_clean,))
            conn.commit()
            
            return {"role": row[0], "status": row[1]}
    finally:
        conn.close()

import re

@app.post("/auth/login")
async def login(payload: dict):
    email = payload.get("email")
    password = payload.get("password")
    role = payload.get("role", "Admin")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and Password are required.")

    # Email format validation
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    if not email.lower().endswith("@gmail.com"):
        raise HTTPException(status_code=403, detail="Only @gmail.com accounts are permitted.")

    # Mock password check (minimum 6 charts as per frontend)
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # In a real app, verify against DB. For this project, we simulate success for valid formats.
    return {
        "status": "success", 
        "user": {
            "role": role, 
            "name": email.split('@')[0].capitalize(),
            "email": email
        }
    }

@app.get("/notifications")
def get_notifications():
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, message, type, is_read, timestamp FROM notifications ORDER BY timestamp DESC LIMIT 20")
            rows = cur.fetchall()
            return [
                {"id": r[0], "message": r[1], "type": r[2], "is_read": r[3], "timestamp": r[4].isoformat()}
                for r in rows
            ]
    finally:
        conn.close()

@app.post("/notifications/read/{notif_id}")
def mark_notification_read(notif_id: int):
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE notifications SET is_read = TRUE WHERE id = %s", (notif_id,))
            conn.commit()
            return {"status": "success"}
    finally:
        conn.close()

# Internal helper to add notifications
def add_notification(message: str, notif_type: str = "Info"):
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO notifications (message, type) VALUES (%s, %s)", (message, notif_type))
            conn.commit()
    finally:
        conn.close()

@app.post("/review/resolve")
def resolve_review(payload: dict):
    # Payload: {transaction_id, feedback, user_role}
    success, msg = review_queue.resolve_transaction(
        payload.get("transaction_id"),
        payload.get("feedback")
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    
    # Audit trail
    audit.log_event(
        action_type="REVIEW_RESOLVED",
        transaction_id=payload.get("transaction_id"),
        user_role=payload.get("user_role", "Analyst"),
        metadata={"feedback": payload.get("feedback")}
    )
    
    return {"status": "success", "message": msg}

# --- DB Helpers ---
def get_transaction_from_db(tx_id):
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT transaction_id, card_id, state, probability FROM fraud_logs WHERE transaction_id = %s", (tx_id,))
            row = cur.fetchone()
            if row:
                return {
                    "transaction_id": row[0],
                    "card_id": row[1],
                    "decision": row[2],
                    "probability": row[3],
                    "from_cache": True
                }
    finally:
        conn.close()
    return None

def save_transaction_to_db(tx_id, card_id, prob, state, features, version):
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO fraud_logs 
                (transaction_id, card_id, probability, state, features, model_version, prediction) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (tx_id, card_id, prob, state.value, json.dumps(features), version, 1 if prob > 0.5 else 0))
            conn.commit()
    finally:
        conn.close()

@app.get("/search")
def global_search(q: str = ""):
    if not q or len(q) < 2:
        return {"transactions": [], "models": []}
    
    conn = psycopg2.connect(POSTGRES_URL)
    try:
        with conn.cursor() as cur:
            search_query = f"%{q}%"
            # Search transactions
            cur.execute("""
                SELECT transaction_id, card_id, probability, state, timestamp 
                FROM fraud_logs 
                WHERE transaction_id ILIKE %s OR card_id ILIKE %s 
                ORDER BY timestamp DESC LIMIT 5
            """, (search_query, search_query))
            tx_rows = cur.fetchall()
            transactions = [
                {
                    "transaction_id": r[0],
                    "card_id": r[1],
                    "probability": r[2],
                    "state": r[3],
                    "timestamp": r[4].isoformat() if r[4] else None
                } for r in tx_rows
            ]
            
            # Search models
            cur.execute("""
                SELECT version_name, baseline_auc, created_at, is_active 
                FROM model_versions 
                WHERE version_name ILIKE %s 
                ORDER BY created_at DESC LIMIT 5
            """, (search_query,))
            model_rows = cur.fetchall()
            models = [
                {
                    "version_name": r[0],
                    "baseline_auc": r[1],
                    "created_at": r[2].isoformat() if r[2] else None,
                    "is_active": r[3]
                } for r in model_rows
            ]
            
            return {"transactions": transactions, "models": models}
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
