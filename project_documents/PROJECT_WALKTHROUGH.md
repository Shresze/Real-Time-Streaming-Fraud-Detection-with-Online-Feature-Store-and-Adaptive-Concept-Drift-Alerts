# 🔍 Project Walkthrough: Fraud Risk Intelligence Platform
## Module-by-Module Technical Breakdown

---

## 1. Project Overview

This document provides a detailed walkthrough of every module in the Fraud Risk Intelligence Platform — a real-time, ML-powered financial fraud detection system built with **11 Docker services**, **7 database tables**, and a **React operational dashboard**.

![System Architecture](images/system_architecture.png)

---

## 2. End-to-End Data Flow

![Data Pipeline](images/data_pipeline.png)

### Step-by-Step Transaction Lifecycle

```
Step 1: Transaction Arrives
   └── Kafka Producer reads creditcard.csv row-by-row
   └── Sends JSON message to 'transactions' topic at ~10 tx/sec

Step 2: Stream Processing
   └── Apache Flink consumes from Kafka topic
   └── RedisSink extracts features and writes to Redis
   └── Key format: "features:{card_id}"

Step 3: Feature Lookup
   └── FastAPI /predict/{card_id} endpoint receives request
   └── Retrieves feature vector from Redis in <1ms

Step 4: ML Inference
   └── ModelRegistry loads active model (XGBoost + calibration)
   └── Predicts P(fraud) as calibrated probability [0, 1]

Step 5: Decision Policy
   └── P ≥ 0.9  → BLOCKED (auto-deny)
   └── P ≥ 0.7  → UNDER_REVIEW (human review)
   └── P < 0.7  → APPROVED (auto-allow)
   └── If health < 70%: thresholds tighten by 20%

Step 6: Persistence & Audit
   └── Transaction saved to PostgreSQL (fraud_logs)
   └── Audit event logged (audit_logs)
   └── Decision returned to caller

Step 7: Human Review (if UNDER_REVIEW)
   └── Analyst sees transaction in Review Queue
   └── Views risk factors, SHAP drivers, recommendation
   └── Resolves as: Confirmed Fraud / False Positive / Legitimate
   └── Feedback stored in feedback_store for retraining

Step 8: Continuous Monitoring
   └── Every 5 seconds, orchestrator processes a batch
   └── Computes AUC, PSI, Wasserstein, health score
   └── Fires alerts if thresholds breached
   └── Dashboard updates in real-time via polling
```

---

## 3. Module Breakdown

### 3.1 Data Ingestion (`backend/ingestion/producer.py`)

**Purpose**: Stream raw transactions from CSV into Apache Kafka.

**How it works**:
- Reads `creditcard.csv` (284,807 rows)
- Connects to Kafka with retry logic (10 attempts, 5s apart)
- Serializes each row as JSON with an `event_time` timestamp
- Sends to `transactions` topic at 10 tx/sec
- Logs progress every 100 transactions

**Key Config**: `KAFKA_BOOTSTRAP_SERVERS` environment variable

---

### 3.2 Stream Processing (`backend/processing/fraud_processor.py`)

**Purpose**: Apache Flink job that consumes Kafka, extracts features, and populates Redis.

**How it works**:
- PyFlink `StreamExecutionEnvironment` with parallelism=1
- `KafkaSource` reads from `transactions` topic (earliest offset)
- `RedisSink` parses JSON, extracts all features
- Stores in Redis: key=`features:{V1}`, value=full JSON feature vector
- Uses V1 as a proxy for card ID (dataset has no native card ID)

**Technologies**: PyFlink, KafkaSource, Redis

---

### 3.3 ML Training (`backend/ml/train_model.py`)

**Purpose**: Train, tune, calibrate, and save the XGBoost fraud detection model.

**Training Pipeline**:

```
Phase 1: Data Preparation
├── Load creditcard.csv
├── Drop 'Time' feature (leakage prevention)
├── Features: V1-V28 + Amount (29 features)
└── Stratified 80/20 train/test split (random_state=42)

Phase 2: SMOTE + Hyperparameter Tuning
├── Pipeline: SMOTE → XGBClassifier
├── RandomizedSearchCV (10 iterations, 3-fold CV)
├── Scoring: F1-Score
├── Search space: n_estimators, max_depth, learning_rate,
│                 subsample, colsample_bytree
└── Output: best_pipeline

Phase 3: Probability Calibration
├── CalibratedClassifierCV(best_pipeline)
├── Method: Sigmoid (Platt scaling)
├── CV: 3-fold
└── Output: calibrated_model with well-calibrated P(fraud)

Phase 4: Artifact Saving
├── model.joblib (full calibrated model)
├── model.json (raw XGBoost model)
├── features.json (feature name list)
└── baseline_stats.json (training data statistics)
```

**Why SMOTE inside Pipeline**: Applying SMOTE outside CV would create synthetic samples that leak into validation folds, giving optimistically biased F1 scores.

**Why Platt Calibration**: XGBoost outputs uncalibrated scores. The decision engine needs true probabilities to set meaningful thresholds (0.7 for review, 0.9 for block).

---

### 3.4 Inference API (`backend/inference/main.py`)

**Purpose**: FastAPI server exposing all REST endpoints (16 total).

**Key Endpoints**:

| Endpoint | Method | What It Does |
|---|---|---|
| `/predict/{card_id}` | POST | Core inference: features → probability → decision |
| `/monitoring/state` | GET | Returns full monitoring state + financial impact |
| `/models` | GET | Lists all registered model versions |
| `/models/switch` | POST | Zero-downtime model version switching |
| `/models/retrain` | POST | Triggers feedback-driven retraining pipeline |
| `/review/queue` | GET | Pending human review items |
| `/review/resolve` | POST | Analyst resolves a transaction |
| `/auth/login` | POST | Credential-based authentication |
| `/auth/profile/{email}` | GET | OAuth profile verification against DB |
| `/admin/users` | GET | Team member registry |
| `/admin/users/update` | POST | Modify user roles/status |
| `/admin/users/add` | POST | Invite new team member |
| `/audit/logs` | GET | Retrieve audit trail (last 50) |
| `/audit/clear` | POST | Clear audit logs (Admin + security key) |
| `/notifications` | GET | System alerts/notifications |
| `/search` | GET | Global search across transactions & models |

**Middleware**: Path normalization strips `/api/` prefix (frontend proxy sends `/api/...`, backend routes are `/...`).

**Startup**: Loads active model from registry on boot.

---

### 3.5 Monitoring Orchestrator (`backend/monitoring/orchestrator.py`)

**Purpose**: Singleton background thread running the continuous monitoring simulation.

**5-Second Loop**:
```
┌─ Sync active model (every 30s) ──────────────────────┐
│                                                       │
│  1. Get next batch (1000 rows from DataStream)        │
│  2. Run inference → probabilities                     │
│  3. Evaluate performance (AUC, precision, recall)     │
│  4. Compute confusion matrix (TP, FP, FN, TN)        │
│  5. Calculate data drift (PSI per feature)            │
│  6. Calculate prediction drift (Wasserstein)          │
│  7. Run intelligence layer (KMeans + IsolationForest) │
│  8. Update rolling metrics (window=20 batches)        │
│  9. Check alert rules (4 types)                       │
│ 10. Compute weighted health score                     │
│ 11. Update thread-safe state object                   │
│ 12. Persist 5% of traffic to database                 │
│                                                       │
└──────────── Wait remainder of 5 seconds ─────────────┘
```

**Sub-Modules**:

| Module | File | Purpose |
|---|---|---|
| DataStream | `data_stream.py` | Batch streaming with drift injection after batch 5 |
| ModelWrapper | `model_wrapper.py` | Model loading, batch inference, performance evaluation |
| DriftMonitor | `drift_monitor.py` | PSI computation, Wasserstein distance |
| MetricsTracker | `metrics.py` | Rolling window (size=20) metric averages |
| AlertEngine | `alert_engine.py` | Rule-based alerting (4 rules) |
| HealthEngine | `health_engine.py` | Weighted 4-component health score |

---

### 3.6 Drift Detection (`backend/monitoring/drift_monitor.py`)

**Purpose**: Detect data drift and prediction drift in real-time.

**Data Drift (PSI)**:
- Pre-computes baseline distributions (10 quantile buckets per feature)
- For each batch, computes PSI per feature against baseline
- Overall PSI = average across all 29 features
- Severity: Stable (< 0.10), Moderate (0.10–0.25), Severe (> 0.25)

**Prediction Drift (Wasserstein)**:
- Compares baseline prediction probabilities vs current batch probabilities
- Uses `scipy.stats.wasserstein_distance`
- Severity: Stable (< 0.05), Moderate (0.05–0.10), Severe (> 0.10)

**Drift Injection (Simulation)**:
After batch 5, controlled drift is injected to test monitoring:
```python
batch['Amount'] *= 1.5                              # 50% scaling
batch['V14'] += Normal(mean=0.5, std=0.2)           # Additive shift
batch['V17'] -= Normal(mean=0.4, std=0.1)           # Subtractive shift
```

---

### 3.7 Decision Engine (`backend/decision_engine/`)

**Purpose**: Govern transaction lifecycle from inference to resolution.

**Components**:

**Policy** (`policy.py`):
- Block threshold: 0.9 (auto-deny)
- Review threshold: 0.7 (human review)
- Adaptive safeguard: thresholds × 0.8 when health < 70%

**State Machine** (`state_machine.py`):
```
7 States: Pending → Approved → Closed
                  → Blocked → Under_Review → Confirmed_Fraud → Closed
                                            → False_Positive → Closed
                            → Confirmed_Fraud → Closed
          → Under_Review (as above)
```

**Audit Manager** (`audit_manager.py`):
- Logs every state transition to `audit_logs` table
- Records: action_type, transaction_id, model_version, user_role, state changes, metadata

**Review Queue** (`review_queue.py`):
- Fetches UNDER_REVIEW transactions from database
- Supports resolve actions: Confirmed Fraud / False Positive / Legitimate
- Stores analyst feedback in `feedback_store` for retraining
- **Reconciliation**: After retraining, re-scores pending items with new model
  - P < 0.1 → Auto-approved
  - P > 0.9 → Auto-confirmed fraud

---

### 3.8 Intelligence Layer (`backend/intelligence/clustering.py`)

**Purpose**: Unsupervised pattern analysis for fraud cluster identification.

**Algorithms Used**:

| Algorithm | Purpose | Config |
|---|---|---|
| **KMeans** | Group transactions into behavioral segments | k=5, n_init=10 |
| **Isolation Forest** | Detect anomalous outlier transactions | contamination=5% |
| **StandardScaler** | Normalize features before clustering | Per-batch fit |

**Output per cluster**: cluster_id, size, fraud_density, outlier_ratio, avg_amount

---

### 3.9 Retraining Pipeline (`backend/retraining/pipeline.py`)

**Purpose**: Automated model retraining from analyst feedback.

**Workflow**:
```
1. Fetch feedback from feedback_store (JOIN with fraud_logs features)
2. Oversample feedback if < 200 samples (repeat to 200)
3. Sample 500 baseline rows for stability
4. Combine: X_train = feedback + baseline
5. Train LogisticRegression(class_weight='balanced', solver='liblinear')
6. Evaluate: AUC-ROC and Recall on training set
7. Register new version in model_versions table
8. Auto-deploy: switch_model to new version
9. Reconcile review queue with new model
10. Log audit event + notification
```

**Why Logistic Regression for retraining**: Fast training (< 1 second) enables interactive retraining from the dashboard. The initial XGBoost model handles the heavy lifting.

---

### 3.10 Business Layer (`backend/business/cost_engine.py`)

**Purpose**: Calculate financial impact of fraud detection decisions.

**Formula**:
```
Net Savings = Fraud Prevented − FP Cost − Friction Cost

Where:
  Fraud Prevented  = SUM(Amount) where state = 'Confirmed Fraud'
  FP Cost          = COUNT(state = 'False Positive') × ₹50
  Friction Cost    = COUNT(state = 'Under Review')   × ₹10
```

---

### 3.11 Frontend Dashboard (`frontend/src/`)

**Purpose**: Real-time operational dashboard built with React + Vite + TailwindCSS.

**Views**:

| View | Key Features |
|---|---|
| **Dashboard** | 4 KPI cards, TPS area chart, latency line chart, live confusion matrix, real-time prediction feed with transaction detail modals (SHAP drivers) |
| **Login Page** | Multi-step auth: role selection → credentials/OAuth, Google account picker simulation, backend role verification |
| **Review Queue** | Pending transactions with analyst toolkit (risk factors, account intelligence, system recommendation), Block/Approve actions |
| **Model Management** | Version list with AUC/drift scores, switch version, trigger retraining with success/error feedback |
| **Intelligence** | IP velocity bar chart, device integrity pie chart, network cluster cards, ML risk cluster grid, deep scan animation |
| **Audit Logs** | Timestamped audit trail viewer |
| **Monitoring Logs** | System alert log with severity indicators |
| **Team Governance** | Featured team cards, user table with role dropdowns, invite modal, revoke/grant rights, immutable super admin |

**RBAC**:
```
Admin:        All views
Risk Analyst: Dashboard, Review Queue, Intelligence
Auditor:      Dashboard, Intelligence, Audit Logs
```

**Real-Time Updates**: Polling every 5 seconds to `/api/monitoring/state`

---

## 4. Performance Visualizations

### 4.1 Model Performance Metrics

![Performance Metrics](images/performance_metrics.png)

### 4.2 ROC Curve (AUC = 0.98)

![ROC Curve](images/roc_curve.png)

### 4.3 Confusion Matrix

![Confusion Matrix](images/confusion_matrix.png)

### 4.4 Class Distribution (Imbalance Visualization)

![Class Distribution](images/class_distribution.png)

---

## 5. How to Run

```bash
# 1. Ensure creditcard.csv is in the project root
# 2. Start all 11 services
docker-compose up --build

# 3. Initialize database (in a new terminal)
docker exec -it major_project-inference-api-1 python database/schema.py

# 4. Train the model
docker exec -it major_project-inference-api-1 python ml/train_model.py

# 5. Seed demo data (optional)
docker exec -it major_project-inference-api-1 python seed_demo_data.py

# 6. Open the dashboard
# → http://localhost:5180
```

### Access Points

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:5180 |
| Inference API | http://localhost:8080 |
| Flink UI | http://localhost:8081 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

---

## 6. Key Design Principles

1. **Immutability**: Audit logs are append-only; super admin cannot be revoked
2. **Idempotency**: Duplicate transaction IDs return cached results
3. **Zero-Downtime**: Model switching swaps in-memory objects atomically
4. **Thread Safety**: Monitoring state protected by `threading.Lock`
5. **Graceful Degradation**: Adaptive safeguards auto-tighten during instability
6. **Feedback Loop**: Human review feeds directly into retraining pipeline
7. **Full Observability**: Every action audited with timestamp, actor, and metadata
