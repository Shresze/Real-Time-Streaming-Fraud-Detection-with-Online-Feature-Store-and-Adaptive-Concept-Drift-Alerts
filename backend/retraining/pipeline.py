import pandas as pd
import numpy as np
import os
import psycopg2
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, recall_score
import joblib
import json

POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/fraud_detection')

class RetrainPipeline:
    def __init__(self, registry, baseline_df):
        self.registry = registry
        self.baseline_df = baseline_df # To combine with feedback
        self.feature_names = [f"V{i}" for i in range(1, 29)] + ["Amount"]

    def run(self):
        # 1. Fetch feedback from DB
        conn = psycopg2.connect(POSTGRES_URL)
        try:
            # Get feedback labels joined with original features from fraud_logs
            query = """
                SELECT l.features, f.label
                FROM feedback_store f
                JOIN fraud_logs l ON f.transaction_id = l.transaction_id
            """
            feedback_df = pd.read_sql(query, conn)
            
            if len(feedback_df) < 1: 
                return {"status": "error", "message": "Insufficient feedback data for retraining (need at least 1 entry)"}

            # 2. Prepare Training Data
            X_feedback = pd.json_normalize(feedback_df['features'])
            X_feedback = X_feedback[self.feature_names]
            y_feedback = feedback_df['label']

            # Over-sample feedback to match baseline weight
            if len(X_feedback) < 200:
                mult = 200 // len(X_feedback)
                X_feedback = pd.concat([X_feedback] * mult)
                y_feedback = pd.concat([y_feedback] * mult)

            # Use a smaller, targeted baseline for better adaptation
            X_baseline = self.baseline_df[self.feature_names].sample(min(500, len(self.baseline_df)))
            y_baseline = self.baseline_df['Class'].loc[X_baseline.index]

            X_train = pd.concat([X_feedback, X_baseline]).reset_index(drop=True)
            y_train = pd.concat([y_feedback, y_baseline]).reset_index(drop=True)

            # 3. Train Fast Model (Logistic Regression)
            model = LogisticRegression(max_iter=1000, class_weight='balanced', solver='liblinear')
            model.fit(X_train, y_train)

            # 4. Evaluate
            probs = model.predict_proba(X_train)[:, 1]
            auc = float(roc_auc_score(y_train, probs))
            recall = float(recall_score(y_train, model.predict(X_train)))

            # 5. Register new version
            version_id = f"v{int(pd.Timestamp.now().timestamp())}"
            self.registry.register_model(
                version_id, 
                model, 
                self.feature_names,
                metrics={'auc': auc, 'recall': recall}
            )

            return {
                "status": "success",
                "version": version_id,
                "metrics": {"auc": auc, "recall": recall}
            }
        except Exception as e:
            return {"status": "error", "message": f"Retraining failed: {str(e)}"}
        finally:
            conn.close()
