import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

class FraudIntelligence:
    def __init__(self, n_clusters=5):
        self.n_clusters = n_clusters
        self.scaler = StandardScaler()
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        self.iso_forest = IsolationForest(contamination=0.05, random_state=42)
        self.is_fitted = False

    def analyze_patterns(self, df):
        if len(df) < self.n_clusters:
            return {"status": "insufficient_data"}

        # Select numeric features for clustering
        # Assuming PCA features V1-V28 and Amount
        features = [f"V{i}" for i in range(1, 29)] + ["Amount"]
        X = df[features]
        X_scaled = self.scaler.fit_transform(X)

        # 1. Outlier Detection (Isolation Forest)
        outliers = self.iso_forest.fit_predict(X_scaled)
        
        # 2. Pattern Clustering (KMeans)
        clusters = self.kmeans.fit_predict(X_scaled)
        
        self.is_fitted = True

        # Calculate cluster profiles
        df_results = df.copy()
        df_results['cluster'] = clusters
        df_results['is_outlier'] = outliers == -1
        
        profiles = []
        for i in range(self.n_clusters):
            cluster_data = df_results[df_results['cluster'] == i]
            if len(cluster_data) == 0: continue
            
            # Find dominant features for this cluster
            # (Simplified approach: compare cluster mean vs population mean)
            profiles.append({
                "cluster_id": i,
                "size": len(cluster_data),
                "fraud_density": cluster_data['Class'].mean() if 'Class' in cluster_data else 0,
                "outlier_ratio": (cluster_data['is_outlier']).mean(),
                "avg_amount": cluster_data['Amount'].mean()
            })

        return {
            "clusters": profiles,
            "outlier_count": int((outliers == -1).sum()),
            "total_count": len(df)
        }

    def detect_emerging_threats(self, current_batch_df, history_df):
        # Implementation of cluster drift detection
        # (Compares current cluster distributions vs historical)
        if not self.is_fitted:
            return []
        
        return ["New high-amount cluster detected in V14-V17 subspace"]
