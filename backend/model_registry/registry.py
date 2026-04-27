import os
import joblib
import psycopg2
from datetime import datetime
import json

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/fraud_detection')

class ModelRegistry:
    def __init__(self, models_dir="/app/models"):
        self.models_dir = models_dir
        self.active_version = None
        self.active_model = None
        self.feature_names = None
        
        # Ensure dir exists
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)

    def load_active_model(self):
        conn = psycopg2.connect(POSTGRES_URL)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT version_name FROM model_versions WHERE is_active = TRUE LIMIT 1")
                row = cur.fetchone()
                if row:
                    version = row[0]
                    self._load_version(version)
                    self.active_version = version
                    print(f"Loaded active model version: {version}")
                    return True
                else:
                    # Fallback to default model if none marked active in DB
                    default_path = os.path.join(self.models_dir, "model.joblib")
                    if os.path.exists(default_path):
                        self.active_model = joblib.load(default_path)
                        self.active_version = "v1_default"
                        print("Loaded default model.joblib")
                        return True
        except Exception as e:
            print(f"Error loading active model: {e}")
        finally:
            conn.close()
        return False

    def _load_version(self, version_name):
        model_path = os.path.join(self.models_dir, f"{version_name}.joblib")
        features_path = os.path.join(self.models_dir, f"{version_name}_features.json")
        
        if os.path.exists(model_path):
            self.active_model = joblib.load(model_path)
            if os.path.exists(features_path):
                with open(features_path, "r") as f:
                    self.feature_names = json.load(f)
            return True
        return False

    def register_model(self, version_name, model_obj, feature_names, metrics=None):
        model_path = os.path.join(self.models_dir, f"{version_name}.joblib")
        features_path = os.path.join(self.models_dir, f"{version_name}_features.json")
        
        joblib.dump(model_obj, model_path)
        with open(features_path, "w") as f:
            json.dump(feature_names, f)
            
        conn = psycopg2.connect(POSTGRES_URL)
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO model_versions 
                    (version_name, baseline_auc, baseline_recall, is_active)
                    VALUES (%s, %s, %s, FALSE)
                    ON CONFLICT (version_name) DO UPDATE SET
                    baseline_auc = EXCLUDED.baseline_auc,
                    baseline_recall = EXCLUDED.baseline_recall
                """, (version_name, metrics.get('auc', 0), metrics.get('recall', 0)))
                conn.commit()
        finally:
            conn.close()

    def switch_model(self, version_name):
        conn = psycopg2.connect(POSTGRES_URL)
        try:
            with conn.cursor() as cur:
                # Deactivate others
                cur.execute("UPDATE model_versions SET is_active = FALSE")
                # Activate this one
                cur.execute("UPDATE model_versions SET is_active = TRUE WHERE version_name = %s", (version_name,))
                if cur.rowcount == 0:
                    conn.rollback()
                    return False, f"Version {version_name} not found in database"
                
                # Zero-downtime part: Swapping object in memory
                if self._load_version(version_name):
                    self.active_version = version_name
                    conn.commit()
                    return True, "Model switched successfully"
                else:
                    conn.rollback()
                    return False, "Model file not found"
        finally:
            conn.close()

    def get_all_versions(self):
        conn = psycopg2.connect(POSTGRES_URL)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT version_name, created_at, baseline_auc, is_active FROM model_versions ORDER BY created_at DESC")
                rows = cur.fetchall()
                return [{"version": r[0], "created_at": r[1].isoformat(), "auc": r[2], "is_active": r[3]} for r in rows]
        finally:
            conn.close()
