import numpy as np
import pandas as pd
from river import drift
import json
import os

class DriftMonitor:
    def __init__(self, baseline_stats_path="../models/baseline_stats.json"):
        self.adwin = drift.ADWIN()
        self.baseline_stats = None
        if os.path.exists(baseline_stats_path):
            with open(baseline_stats_path, "r") as f:
                self.baseline_stats = json.load(f)
        
    def calculate_psi(self, expected, actual, buckets=10):
        """
        Calculates PSI for two distributions.
        """
        def get_buckets(data, buckets):
            return pd.qcut(data, buckets, labels=False, duplicates='drop')

        expected_buckets = get_buckets(expected, buckets)
        actual_buckets = get_buckets(actual, buckets)

        expected_percents = expected_buckets.value_counts(normalize=True).sort_index()
        actual_percents = actual_buckets.value_counts(normalize=True).sort_index()

        # Align indices
        all_indices = expected_percents.index.union(actual_percents.index)
        expected_percents = expected_percents.reindex(all_indices, fill_value=0.0001)
        actual_percents = actual_percents.reindex(all_indices, fill_value=0.0001)

        psi_val = np.sum((actual_percents - expected_percents) * np.log(actual_percents / expected_percents))
        return psi_val

    def update_adwin(self, prediction_error):
        """
        Updates ADWIN with the latest prediction error (e.g., 0 for correct, 1 for drift).
        In unsupervised mode, we might use prediction probability or value itself.
        """
        self.adwin.update(prediction_error)
        if self.adwin.drift_detected:
            return True
        return False

# Unit test or demo logic
if __name__ == "__main__":
    monitor = DriftMonitor()
    # Mock data
    expected = np.random.normal(0, 1, 1000)
    actual = np.random.normal(0.5, 1.1, 1000)
    
    psi_score = monitor.calculate_psi(expected, actual)
    print(f"Calculated PSI: {psi_score}")
    
    if psi_score > 0.25:
        print("ALERT: Significant drift detected via PSI!")
