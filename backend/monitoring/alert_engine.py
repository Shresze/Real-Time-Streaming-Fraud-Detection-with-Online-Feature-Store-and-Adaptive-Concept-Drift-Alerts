import time
import numpy as np
from datetime import datetime
from collections import deque

class AlertEngine:
    def __init__(self, history_size=100):
        self.alerts = deque(maxlen=history_size)
        self.consecutive_concept_drifts = 0
        
    def check_rules(self, current_metrics, baseline_metrics, drift_state):
        new_alerts = []
        timestamp = datetime.now().isoformat()
        
        # 1. Concept Drift Rule: AUC Drop > 5% of REALISTIC target
        # Our target is already 95% of baseline. We alert only if it drops another 5%.
        target_auc = baseline_metrics['auc'] * 0.95
        auc_drop = target_auc - current_metrics.get('rolling_auc', target_auc)
        
        if auc_drop > 0.05:
            self.consecutive_concept_drifts += 1
            new_alerts.append({
                'id': f'concept-drift-{time.time()}',
                'type': 'Critical',
                'title': 'Concept Drift Detected',
                'message': f"Rolling AUC has dropped to {current_metrics.get('rolling_auc', 0):.3f}. Model might be stale.",
                'timestamp': datetime.now().strftime("%H:%M:%S")
            })
        else:
            self.consecutive_concept_drifts = 0

        # 2. Performance Rule: Recall < 80%
        recall = current_metrics.get('rolling_recall', 1.0)
        if recall < 0.80:
            new_alerts.append({
                'timestamp': timestamp,
                'type': 'Performance Degradation',
                'severity': 'High',
                'description': f"Fraud Recall dropped to {recall:.2%}, below 80% threshold.",
                'retraining_recommendation': True
            })

        # 3. Fraud Spike Rule: Fraud rate > 2x baseline
        fraud_rate = current_metrics.get('fraud_rate', 0)
        baseline_fraud_rate = baseline_metrics['fraud_rate']
        if fraud_rate > 2 * baseline_fraud_rate and baseline_fraud_rate > 0:
            new_alerts.append({
                'timestamp': timestamp,
                'type': 'Fraud Spike',
                'severity': 'High',
                'description': f"Current fraud rate ({fraud_rate:.4%}) is more than 2x baseline ({baseline_fraud_rate:.4%}).",
                'retraining_recommendation': False
            })

        # 4. Data Drift Rule (from drift_monitor)
        if drift_state['overall_severity'] == 'Severe':
             new_alerts.append({
                'timestamp': timestamp,
                'type': 'Data Drift',
                'severity': 'High',
                'description': f"Severe data drift detected (PSI: {drift_state['overall_psi']:.4f}).",
                'retraining_recommendation': True
            })

        self.alerts.extend(new_alerts)
        return new_alerts

    def is_retraining_required(self, drift_state):
        # We only flag for retraining if drift is sustained OR extremely severe
        # If PSI > 0.5 (Critical Data Drift)
        if drift_state['overall_psi'] > 0.5:
            return True
        # If concept drift (AUC drop) persists for 5 consecutive batches
        if self.consecutive_concept_drifts >= 5:
            return True
        return False

    def get_alerts(self):
        return list(self.alerts)
