import numpy as np
import pandas as pd
from scipy.stats import ks_2samp, wasserstein_distance

class DriftMonitor:
    def __init__(self, feature_names):
        self.feature_names = feature_names
        self.baseline_stats = {}

    def set_baseline_stats(self, baseline_df):
        """
        Pre-compute baseline distributions (histograms and quantiles) once.
        """
        if not self.feature_names:
            print("DriftMonitor: feature_names is None, skipping baseline stats.")
            return

        for feature in self.feature_names:
            expected = baseline_df[feature].values
            
            # Pre-compute PSI buckets
            percentiles = np.linspace(0, 100, 11)
            breakpoints = np.unique(np.percentile(expected, percentiles))
            
            # Standardize breakpoints for the future
            breakpoints[0] = -np.inf
            breakpoints[-1] = np.inf
            
            counts = np.histogram(expected, bins=breakpoints)[0]
            percents = counts / len(expected)
            percents = np.where(percents == 0, 0.0001, percents)
            
            self.baseline_stats[feature] = {
                'psi_breakpoints': breakpoints,
                'expected_percents': percents
            }
        print("Pre-calculated baseline stats (PSI only) for maximum performance.")

    def compute_psi(self, feature, actual):
        stats = self.baseline_stats.get(feature)
        if not stats: return 0.0
        
        breakpoints = stats['psi_breakpoints']
        actual_counts = np.histogram(actual, bins=breakpoints)[0]
        actual_percents = actual_counts / len(actual)
        actual_percents = np.where(actual_percents == 0, 0.0001, actual_percents)
        
        expected_percents = stats['expected_percents']
        
        psi_val = np.sum((actual_percents - expected_percents) * np.log(actual_percents / expected_percents))
        return float(psi_val)

    def calculate_drift(self, batch_df):
        drift_results = {}
        total_psi = 0
        
        for feature in self.feature_names:
            actual = batch_df[feature].values
            psi = self.compute_psi(feature, actual)
            
            # Simple KS Stat placeholder for high-speed simulation
            # In production, this would compare against base distribution
            ks_stat = min(1.0, psi * 2) 
            
            drift_results[feature] = {
                'psi': psi,
                'ks_stat': float(ks_stat),
                'severity': 'Severe' if psi > 0.25 else ('Moderate' if psi > 0.1 else 'Stable')
            }
            total_psi += psi
            
        avg_psi = total_psi / len(self.feature_names)
        
        return {
            'feature_drift': drift_results,
            'overall_psi': avg_psi,
            'overall_severity': 'Severe' if avg_psi > 0.25 else ('Moderate' if avg_psi > 0.1 else 'Stable')
        }


    def compute_prediction_drift(self, baseline_probs, batch_probs):
        w_dist = wasserstein_distance(baseline_probs, batch_probs)
        
        severity = 'Stable'
        if w_dist > 0.1: severity = 'Severe'
        elif w_dist > 0.05: severity = 'Moderate'
            
        return {
            'wasserstein_distance': float(w_dist),
            'severity': severity
        }
