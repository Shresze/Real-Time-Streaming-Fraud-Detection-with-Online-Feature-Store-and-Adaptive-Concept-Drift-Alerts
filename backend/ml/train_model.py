import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import classification_report, f1_score, average_precision_score
from sklearn.calibration import CalibratedClassifierCV
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline
import joblib
import os
import json

def train():
    data_path = "../../creditcard.csv"
    if not os.path.exists(data_path):
        data_path = "creditcard.csv"
        if not os.path.exists(data_path):
            print(f"Error: creditcard.csv not found.")
            return

    print("Loading dataset...")
    df = pd.read_csv(data_path)
    
    # Feature selection: Time is removed as it's often a source of leakage/drift
    # Amount is scaled or kept as is (XGBoost is invariant to scaling, but good for some models)
    X = df.drop(['Time', 'Class'], axis=1)
    y = df['Class']
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Optimization Phase 1: Hyperparameter Tuning + SMOTE...")
    
    # Define Pipeline with SMOTE and XGBoost
    # Using a pipeline ensures SMOTE is only applied to the training folds during CV
    model_pipeline = Pipeline([
        ('smote', SMOTE(random_state=42)),
        ('xgb', xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss'))
    ])
    
    # Parameter grid for tuning
    param_grid = {
        'xgb__n_estimators': [50, 100, 200],
        'xgb__max_depth': [4, 6, 8],
        'xgb__learning_rate': [0.01, 0.1, 0.2],
        'xgb__subsample': [0.7, 0.8, 0.9],
        'xgb__colsample_bytree': [0.7, 0.8, 0.9]
    }
    
    # Randomized Search for efficiency
    search = RandomizedSearchCV(
        model_pipeline, 
        param_distributions=param_grid, 
        n_iter=10, 
        cv=3, 
        scoring='f1', 
        verbose=1, 
        n_jobs=-1,
        random_state=42
    )
    
    search.fit(X_train, y_train)
    best_pipeline = search.best_estimator_
    print(f"Best Parameters: {search.best_params_}")
    
    print("Optimization Phase 2: Probability Calibration...")
    # Calibrate the best XGBoost model from the pipeline
    # We calibrate on the actual (potentially imbalanced) distribution
    calibrated_model = CalibratedClassifierCV(best_pipeline, method='sigmoid', cv=3)
    calibrated_model.fit(X_train, y_train)
    
    # Final Evaluation
    print("Evaluating Optimized Model...")
    y_pred = calibrated_model.predict(X_test)
    y_prob = calibrated_model.predict_proba(X_test)[:, 1]
    
    f1 = f1_score(y_test, y_pred)
    pr_auc = average_precision_score(y_test, y_prob)
    
    print("\nEvaluation Report:")
    print(classification_report(y_test, y_pred))
    print(f"PR-AUC (Precision-Recall Area Under Curve): {pr_auc:.4f}")
    print(f"F1-Score: {f1:.4f}")
    
    # Save model and metadata
    save_dir = "/app/models"
    os.makedirs(save_dir, exist_ok=True)
    
    joblib.dump(calibrated_model, os.path.join(save_dir, "model.joblib"))
    best_pipeline.named_steps['xgb'].save_model(os.path.join(save_dir, "model.json"))
    
    with open(os.path.join(save_dir, "features.json"), "w") as f:
        json.dump(list(X.columns), f)
        
    baseline_stats = X_train.describe().to_json()
    with open(os.path.join(save_dir, "baseline_stats.json"), "w") as f:
        f.write(baseline_stats)
    
    print(f"Optimized model and baseline saved to {save_dir}.")

if __name__ == "__main__":
    train()
