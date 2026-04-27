from .state_machine import TransactionState
import uuid

class DecisionPolicy:
    def __init__(self, block_threshold=0.9, review_threshold=0.7):
        self.block_threshold = block_threshold
        self.review_threshold = review_threshold

    def evaluate(self, probability: float, transaction_id: str = None, safeguard_active: bool = False) -> dict:
        if not transaction_id:
            transaction_id = str(uuid.uuid4())

        # Apply Adaptive Safeguard (20% tightening)
        effective_block = self.block_threshold * (0.8 if safeguard_active else 1.0)
        effective_review = self.review_threshold * (0.8 if safeguard_active else 1.0)

        if probability >= effective_block:
            decision = TransactionState.BLOCKED
        elif probability >= effective_review:
            decision = TransactionState.UNDER_REVIEW
        else:
            decision = TransactionState.APPROVED

        return {
            "transaction_id": transaction_id,
            "decision": decision,
            "reason": f"Score {probability:.4f} is above thresholds" if decision != TransactionState.APPROVED else "Score is below thresholds"
        }

    def update_thresholds(self, block: float, review: float):
        self.block_threshold = block
        self.review_threshold = review
