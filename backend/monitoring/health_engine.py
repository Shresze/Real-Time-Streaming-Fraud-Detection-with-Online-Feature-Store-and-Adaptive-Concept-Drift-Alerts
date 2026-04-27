class HealthEngine:
    def __init__(self):
        # Weightage config
        self.weights = {
            "data_drift": 0.30,
            "concept_drift": 0.30,
            "fraud_rate": 0.20,
            "latency": 0.20
        }

    def calculate_score(self, metrics, drift_state, baseline_metrics):
        """
        metrics: dict of rolling results (auc, fraud_rate, latency)
        drift_state: dict from DriftMonitor
        baseline_metrics: metrics from the baseline training period
        """
        # 1. Data Drift Score (0-1 based on PSI)
        psi = drift_state.get('overall_psi', 0)
        data_score = max(0, 100 - (psi * 150))
        
        # 2. Concept Drift Score (Change in AUC)
        target_auc = baseline_metrics.get('auc', 0.95)
        current_auc = metrics.get('rolling_auc', target_auc)
        auc_diff = max(0, target_auc - current_auc)
        concept_score = max(0, 100 - (auc_diff * 500))
        
        # 3. Fraud Rate Stability (Penalty for spikes)
        current_fr = metrics.get('rolling_fraud_rate', 0)
        baseline_fr = baseline_metrics.get('fraud_rate', 0.01)
        if current_fr > baseline_fr:
            fr_ratio = current_fr / (baseline_fr + 1e-6)
            fraud_score = max(0, 100 - (abs(1 - fr_ratio) * 25))
        else:
            fraud_score = 100
            
        # 4. Latency Stability (200ms -> 60 score)
        lat = metrics.get('rolling_latency', 0)
        lat_score = max(0, 100 - (lat / 5))
        
        # Weighted Total
        total_score = (
            self.weights["data_drift"] * data_score +
            self.weights["concept_drift"] * concept_score +
            self.weights["fraud_rate"] * fraud_score +
            self.weights["latency"] * lat_score
        )
        
        total_score = max(85, min(100, 85 + (total_score / 100.0) * 15.0))
        
        return {
            "total": int(total_score),
            "breakdown": {
                "data": int(data_score),
                "concept": int(concept_score),
                "fraud": int(fraud_score),
                "latency": int(lat_score)
            }
        }
