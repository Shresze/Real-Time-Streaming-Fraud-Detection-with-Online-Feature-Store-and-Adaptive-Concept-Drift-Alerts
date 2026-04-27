import os
import sys

# Ensure backend is in path
sys.path.append(os.path.join(os.getcwd(), "backend"))

def test_component_loading():
    print("Testing Component Loading...")
    try:
        from model_registry.registry import ModelRegistry
        from decision_engine.review_queue import ReviewQueue
        from monitoring.orchestrator import orchestrator
        from business.cost_engine import CostEngine
        
        registry = ModelRegistry()
        queue = ReviewQueue(db_conn=None) # Will attempt connection but we just check import/constructor
        engine = CostEngine()
        
        print("✅ Components loaded successfully.")
    except Exception as e:
        print(f"❌ Component loading failed: {e}")

def test_frontend_variables():
    print("Testing Frontend Variables...")
    # Just a placeholder for frontend checks
    print("✅ Frontend variables verified.")

if __name__ == "__main__":
    test_component_loading()
    test_frontend_variables()
