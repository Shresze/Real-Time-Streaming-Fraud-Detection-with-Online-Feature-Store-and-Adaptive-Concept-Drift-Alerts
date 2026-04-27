import joblib
import json
import os
import pandas as pd
from sklearn.metrics import roc_auc_score, precision_score, recall_score

class ModelWrapper:
    def __init__(self, model_dir="/app/models"):
        self.model_dir = model_dir
        self.feature_names = None
        self.model = None
        self.active_version = None
        self.baseline_perf = {}
        self.reload()
            
    def reload(self, version_name=None):
        """Reload the latest active model from the directory/database logic."""
        try:
            # If a specific version is provided, try to load it first
            v_name = version_name or "model"
            
            # Robust path discovery
            possible_dirs = [self.model_dir, "/app/models", "models", "./models"]
            model_path = None
            features_path = None
            
            for d in possible_dirs:
                if not os.path.exists(d): continue
                m_p = os.path.join(d, f"{v_name}.joblib")
                f_p = os.path.join(d, f"{v_name}_features.json")
                if os.path.exists(m_p):
                    model_path, features_path = m_p, f_p
                    break
            
            # Fallback to default model.joblib if version not found
            if not model_path:
                for d in possible_dirs:
                    if not os.path.exists(d): continue
                    m_p = os.path.join(d, "model.joblib")
                    f_p = os.path.join(d, "features.json")
                    if os.path.exists(m_p):
                        model_path, features_path = m_p, f_p
                        v_name = "model"
                        break
            
            if model_path:
                self.model = joblib.load(model_path)
                if os.path.exists(features_path):
                    with open(features_path, 'r') as f:
                        self.feature_names = json.load(f)
                else:
                    # Emergency fallback features
                    self.feature_names = [f"V{i}" for i in range(1, 29)] + ["Amount"]
                
                self.active_version = v_name
                print(f"ModelWrapper: Successfully loaded version {v_name}")
                return True
            else:
                print(f"ModelWrapper: CRITICAL - No model found in any of {possible_dirs}")
        except Exception as e:
            print(f"Failed to reload model: {e}")
        return False

    def compute_baseline_performance(self, baseline_df):
        if not self.feature_names:
            print("Warning: feature_names not loaded yet. Skipping baseline perf.")
            return {}

        X = baseline_df[self.feature_names]
        y = baseline_df['Class']
        
        probs = self.model.predict_proba(X)[:, 1]
        preds = (probs > 0.5).astype(int)
        
        self.baseline_perf = {
            'auc': float(roc_auc_score(y, probs)),
            'precision': float(precision_score(y, preds, zero_division=0)),
            'recall': float(recall_score(y, preds, zero_division=0)),
            'fraud_rate': float(y.mean()),
            'probs': probs.tolist()
        }
        return self.baseline_perf

    def predict_batch(self, batch_df):
        X = batch_df[self.feature_names]
        
        # We need the true labels for concept drift monitoring (simulated ground truth)
        y = batch_df['Class'] if 'Class' in batch_df.columns else None
        
        probs = self.model.predict_proba(X)[:, 1]
        preds = (probs > 0.5).astype(int)
        
        return {
            'probs': probs,
            'preds': preds,
            'true_labels': y
        }
    
    def evaluate_performance(self, y_true, y_prob):
        y_pred = (y_prob > 0.5).astype(int)
        
        # Calculate Confusion Matrix components
        tp = int(((y_pred == 1) & (y_true == 1)).sum())
        fp = int(((y_pred == 1) & (y_true == 0)).sum())
        fn = int(((y_pred == 0) & (y_true == 1)).sum())
        tn = int(((y_pred == 0) & (y_true == 0)).sum())
        
        total = tp + fp + fn + tn
        accuracy = (tp + tn) / total if total > 0 else 0
        
        return {
            'auc': float(roc_auc_score(y_true, y_prob)) if len(set(y_true)) > 1 else 0.5,
            'precision': float(precision_score(y_true, y_pred, zero_division=0)),
            'recall': float(recall_score(y_true, y_pred, zero_division=0)),
            'accuracy': float(accuracy),
            'confusion_matrix': {
                'tp': tp,
                'fp': fp,
                'fn': fn,
                'tn': tn
            }
        }
