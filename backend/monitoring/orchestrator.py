import threading
import time
import os
import psycopg2
from datetime import datetime
import json
import numpy as np

from .data_stream import DataStream
from .model_wrapper import ModelWrapper
from .drift_monitor import DriftMonitor
from .metrics import MetricsTracker
from .alert_engine import AlertEngine
from .health_engine import HealthEngine
from intelligence.clustering import FraudIntelligence

class MonitoringOrchestrator:
    def __init__(self):
        self.data_stream = DataStream()
        self.model_wrapper = ModelWrapper()
        
        # Initialize immutable baseline
        baseline_df = self.data_stream.get_baseline()
        self.baseline_metrics = self.model_wrapper.compute_baseline_performance(baseline_df)
        
        self.drift_monitor = DriftMonitor(self.model_wrapper.feature_names)
        self.drift_monitor.set_baseline_stats(baseline_df)
        
        self.metrics_tracker = MetricsTracker(window_size=20)
        self.alert_engine = AlertEngine()
        self.health_engine = HealthEngine()
        self.intelligence = FraudIntelligence()
        
        self.state = {
            'system_status': 'Initialising',
            'health_score': 100,
            'health_breakdown': {},
            'data_drift_score': 0,
            'concept_drift_score': 0,
            'fraud_rate_batch': 0,
            'fraud_rate_rolling': 0,
            'auc_batch': 0,
            'auc_rolling': 0,
            'psi_overall': 0,
            'top_drifting_features': [],
            'prediction_drift_score': 0,
            'latency_batch': 0,
            'latency_rolling': 0,
            'intelligence_clusters': [],
            'retraining_required': False,
            'alerts_log': []
        }
        
        self.is_running = False
        self.thread = None
        self.lock = threading.Lock()

    def start_simulation(self):
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self._run_loop, daemon=True)
            self.thread.start()

    def stop_simulation(self):
        self.is_running = False

    def _run_loop(self):
        print("Starting Simulation Loop...")
        last_sync = 0
        while self.is_running:
            try:
                # Periodic Model Sync (Check every 30s)
                if time.time() - last_sync > 30:
                    self._sync_active_model()
                    last_sync = time.time()

                start_time = time.time()
                batch = self.data_stream.get_next_batch()
                
                if batch is None:
                    print("End of stream reached. Resetting.")
                    self.data_stream.reset()
                    continue
                
                # 1. Inference
                inf_start = time.time()
                results = self.model_wrapper.predict_batch(batch)
                inf_latency = (time.time() - inf_start) * 1000 # ms
                
                # 2. Performance Metrics
                perf = self.model_wrapper.evaluate_performance(results['true_labels'], results['probs'])
                fraud_rate = results['true_labels'].mean()
                
                # 3. Drift Detection
                drift_state = self.drift_monitor.calculate_drift(batch)
                pred_drift = self.drift_monitor.compute_prediction_drift(self.baseline_metrics['probs'], results['probs'])
                
                # 4. Intelligence Layer
                intel_results = self.intelligence.analyze_patterns(batch)
                
                # 5. Update Tracker
                batch_metrics = {
                    'auc': perf['auc'] * (0.98 + np.random.random() * 0.04), # Add jitter
                    'precision': perf['precision'],
                    'recall': perf['recall'],
                    'fraud_rate': float(fraud_rate) + (np.random.random() * 0.02 if np.random.random() > 0.8 else 0), # Occasional spikes
                    'latency': inf_latency * (0.9 + np.random.random() * 0.2),
                    'tps': (len(batch) / 5.0) + (np.random.random() * 2),
                    'psi': drift_state['overall_psi'] + (np.random.random() * 0.15 if np.random.random() > 0.5 else 0),
                    'wasserstein': pred_drift['wasserstein_distance']
                }
                self.metrics_tracker.add_batch_results(batch_metrics)
                full_metrics = self.metrics_tracker.get_full_state()
                
                # 6. Alerting
                new_alerts = self.alert_engine.check_rules(full_metrics, self.baseline_metrics, drift_state)
                retraining_req = self.alert_engine.is_retraining_required(drift_state)
                
                # Persist new alerts to DB as persistent notifications
                if new_alerts:
                    self._persist_notifications(new_alerts)
                
                # 7. Health Score Calculation (Using new weighted engine)
                health_result = self.health_engine.calculate_score(full_metrics, drift_state, self.baseline_metrics)
                
                # 8. Update State
                top_features = sorted(
                    drift_state['feature_drift'].items(), 
                    key=lambda x: x[1]['psi'], 
                    reverse=True
                )[:5]

                with self.lock:
                    self.state.update({
                        'system_status': 'Stable' if health_result['total'] > 80 else ('Warning' if health_result['total'] > 60 else 'Critical'),
                        'health_score': health_result['total'],
                        'adaptive_safeguard': health_result['total'] < 70,
                        'health_breakdown': health_result['breakdown'],
                        'data_drift_score': float(drift_state['overall_psi']),
                        'concept_drift_score': float(self.baseline_metrics['auc'] - full_metrics.get('rolling_auc', self.baseline_metrics['auc'])),
                        'fraud_rate_batch': float(batch_metrics['fraud_rate']),
                        'fraud_rate_rolling': float(full_metrics.get('rolling_fraud_rate', 0)),
                        'auc_batch': float(batch_metrics['auc']),
                        'auc_rolling': float(full_metrics.get('rolling_auc', 0)),
                        'accuracy_rolling': float(perf.get('accuracy', 0.99)),
                        'performance_matrix': perf.get('confusion_matrix', {'tp': 100, 'fp': 1, 'fn': 1, 'tn': 900}),
                        'psi_overall': float(drift_state['overall_psi'] + np.random.uniform(-0.05, 0.05)),
                        'top_drifting_features': [f[0] for f in top_features],
                        'prediction_drift_score': float(pred_drift['wasserstein_distance']),
                        'latency_batch': float(inf_latency),
                        'latency_rolling': float(full_metrics.get('rolling_latency', 0)),
                        'intelligence_clusters': intel_results.get('clusters', []),
                        'retraining_required': retraining_req or (np.random.random() > 0.95), # Randomly trigger for demo
                        'alerts_log': self.alert_engine.get_alerts()
                    })

                    # Inject a "Live Alert" for demo if fraud rate is high
                    if batch_metrics['fraud_rate'] > 0.01:
                       self.state['alerts_log'].insert(0, {
                           'timestamp': datetime.now().isoformat(),
                           'type': 'Critical',
                           'message': f"Fraud Spike Detected: {batch_metrics['fraud_rate']:.2%} of traffic flagged."
                       })

                # 9. Persistence (Log 5% of traffic to DB for historical lookup)
                if np.random.random() < 0.05:
                    self._persist_transaction_batch(batch, results['probs'])

                # Wait for next cycle (5 seconds total)
                elapsed = time.time() - start_time
                wait_time = max(0, 5 - elapsed)
                time.sleep(wait_time)
                
            except Exception as e:
                print(f"Error in simulation loop: {e}")
                time.sleep(5)

    def retrain(self):
        with self.lock:
            self.alert_engine.consecutive_concept_drifts = 0
            self.state['retraining_required'] = False
            return {"status": "success", "message": "Monitors reset after retraining simulation."}

    def get_state(self):
        with self.lock:
            return self.state.copy()

    def _persist_transaction_batch(self, batch, probs):
        """Helper to save a sample of transactions to the DB."""
        POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@postgres:5432/fraud_detection')
        try:
            conn = psycopg2.connect(POSTGRES_URL)
            with conn.cursor() as cur:
                for i in range(len(batch)):
                    row = batch.iloc[i]
                    prob = float(probs[i])
                    tx_id = f"sim_{int(time.time())}_{i}"
                    card_id = f"4532-xxxx-xxxx-{np.random.randint(1000, 9999)}"
                    
                    # Store 29 features
                    feature_names = [f"V{i}" for i in range(1, 29)] + ["Amount"]
                    features_dict = {k: float(row[k]) for k in feature_names}
                    
                    # Logic for state: If prob is in the "Gray Area" (0.5 to 0.8), set to Pending
                    state = 'Pending' if 0.5 <= prob <= 0.8 else ('Blocked' if prob > 0.8 else 'Approved')
                    
                    cur.execute("""
                        INSERT INTO fraud_logs 
                        (transaction_id, card_id, probability, state, features, model_version, prediction) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (transaction_id) DO NOTHING
                    """, (tx_id, card_id, prob, state, json.dumps(features_dict), "v1_stable", 1 if prob > 0.5 else 0))
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to persist transaction batch: {e}")

    def _sync_active_model(self):
        """Check DB for the currently active version and reload if changed."""
        POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@postgres:5432/fraud_detection')
        try:
            conn = psycopg2.connect(POSTGRES_URL)
            with conn.cursor() as cur:
                cur.execute("SELECT version_name FROM model_versions WHERE is_active = TRUE LIMIT 1")
                row = cur.fetchone()
                if row:
                    version = row[0]
                    if version != self.model_wrapper.active_version:
                        print(f"Syncing simulation with new active model: {version}")
                        self.model_wrapper.reload(version)
            conn.close()
        except Exception as e:
            print(f"Failed to sync active model: {e}")

    def _persist_notifications(self, alerts):
        """Helper to save alerts directly to DB from the simulation thread."""
        POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@postgres:5432/fraud_detection')
        try:
            conn = psycopg2.connect(POSTGRES_URL)
            with conn.cursor() as cur:
                for alert in alerts:
                    notif_type = alert.get('type') or alert.get('severity') or 'Info'
                    message = alert.get('message') or alert.get('description') or 'System event detected'
                    cur.execute(
                        "INSERT INTO notifications (message, type) VALUES (%s, %s)",
                        (message, notif_type)
                    )
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to persist notifications: {e}")

# Singleton instance
orchestrator = MonitoringOrchestrator()
orchestrator.start_simulation()
