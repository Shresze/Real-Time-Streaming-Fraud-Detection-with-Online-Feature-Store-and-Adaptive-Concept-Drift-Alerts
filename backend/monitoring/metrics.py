from collections import deque
import numpy as np

class MetricsTracker:
    def __init__(self, window_size=20):
        self.window_size = window_size
        self.history = deque(maxlen=window_size)
        
    def add_batch_results(self, results):
        """
        results: dict containing 'auc', 'precision', 'recall', 'fraud_rate', 'latency', 'tps', etc.
        """
        self.history.append(results)
        
    def get_rolling_metrics(self):
        if not self.history:
            return {}
            
        keys = self.history[0].keys()
        rolling = {}
        
        for key in keys:
            if isinstance(self.history[0][key], (int, float)):
                values = [h[key] for h in self.history]
                rolling[f'rolling_{key}'] = float(np.mean(values))
        
        return rolling

    def get_latest_metrics(self):
        if not self.history:
            return {}
        return self.history[-1]
    
    def get_full_state(self):
        latest = self.get_latest_metrics()
        rolling = self.get_rolling_metrics()
        return {**latest, **rolling}
