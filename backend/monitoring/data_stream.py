import pandas as pd
import numpy as np
import os

class DataStream:
    def __init__(self, data_path="creditcard.csv", batch_size=1000):
        # In Docker, we map to /app/creditcard.csv. 
        # Cwd is /app, so 'creditcard.csv' should work.
        if not os.path.exists(data_path) or os.path.getsize(data_path) == 0:
            # Fallback for local dev or different structures
            potential_paths = ["backend/creditcard.csv", "../creditcard.csv", "/app/creditcard.csv"]
            for path in potential_paths:
                if os.path.exists(path) and os.path.getsize(path) > 0:
                    data_path = path
                    break
            else:
                 raise FileNotFoundError(f"Could not find a valid, non-empty creditcard.csv. Last tried: {data_path}")

        print(f"Loading data from {data_path}...")
        self.df = pd.read_csv(data_path)
        self.df = self.df.sort_values('Time')
        self.batch_size = batch_size
        
        # Freeze Baseline (First 50,000 rows)
        self.baseline_df = self.df.iloc[:50000].copy()
        self.stream_df = self.df.iloc[50000:].reset_index(drop=True)
        
        self.current_batch_index = 0
        
    def get_baseline(self):
        return self.baseline_df
    
    def get_next_batch(self):
        start = self.current_batch_index * self.batch_size
        end = start + self.batch_size
        
        if start >= len(self.stream_df):
            return None
        
        batch = self.stream_df.iloc[start:end].copy()
        
        # Drift Injection after batch 5
        if self.current_batch_index >= 5:
            # Multiply Amount by 1.5
            batch['Amount'] = batch['Amount'] * 1.5
            
            # Shift PCA features V14, V17 with additive noise
            # Simulating data drift in hidden features
            batch['V14'] = batch['V14'] + np.random.normal(0.5, 0.2, size=len(batch))
            batch['V17'] = batch['V17'] - np.random.normal(0.4, 0.1, size=len(batch))
            
            # Note: We do NOT modify labels (Class) directly as per requirements
            
        self.current_batch_index += 1
        return batch

    def reset(self):
        self.current_batch_index = 0
