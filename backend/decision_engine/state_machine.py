from enum import Enum
from typing import Set, Dict

class TransactionState(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    BLOCKED = "Blocked"
    UNDER_REVIEW = "Under Review"
    CONFIRMED_FRAUD = "Confirmed Fraud"
    FALSE_POSITIVE = "False Positive"
    CLOSED = "Closed"

class StateMachine:
    # Valid transitions
    TRANSITIONS: Dict[TransactionState, Set[TransactionState]] = {
        TransactionState.PENDING: {
            TransactionState.APPROVED, 
            TransactionState.BLOCKED, 
            TransactionState.UNDER_REVIEW
        },
        TransactionState.UNDER_REVIEW: {
            TransactionState.CONFIRMED_FRAUD, 
            TransactionState.FALSE_POSITIVE, 
            TransactionState.APPROVED,
            TransactionState.BLOCKED
        },
        TransactionState.BLOCKED: {
            TransactionState.UNDER_REVIEW,
            TransactionState.CONFIRMED_FRAUD
        },
        TransactionState.APPROVED: {
            TransactionState.CLOSED
        },
        TransactionState.CONFIRMED_FRAUD: {
            TransactionState.CLOSED
        },
        TransactionState.FALSE_POSITIVE: {
            TransactionState.APPROVED,
            TransactionState.CLOSED
        },
        TransactionState.CLOSED: set()
    }

    @classmethod
    def is_valid_transition(cls, current: TransactionState, target: TransactionState) -> bool:
        if current == target:
            return True
        return target in cls.TRANSITIONS.get(current, set())

    @classmethod
    def get_allowed_states(cls, current: TransactionState) -> Set[TransactionState]:
        return cls.TRANSITIONS.get(current, set())
