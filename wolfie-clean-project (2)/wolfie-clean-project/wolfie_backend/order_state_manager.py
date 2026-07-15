"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — order_state_manager.py                           ║
║          Single source of truth for all order state transitions             ║
╚══════════════════════════════════════════════════════════════════════════════╝

                         STATE MACHINE DIAGRAM
                         ─────────────────────

                          ┌─────────┐
                          │ PENDING │
                          └────┬────┘
                    driver     │     customer/admin
                  assigns      │     cancels
                    ┌──────────┤
                    ▼          ▼
              ┌──────────┐  ┌────────────┐
              │ ASSIGNED │  │ CANCELLED  │◄──── (from any non-final state)
              └────┬─────┘  └────────────┘
                   │ restaurant
                   │ accepts
                   ▼
            ┌──────────────┐
            │   ACCEPTED   │
            └──────┬───────┘
                   │ restaurant
                   │ starts preparing
                   ▼
            ┌──────────────┐
            │  PREPARING   │
            └──────┬───────┘
                   │ restaurant marks ready
                   ▼
             ┌───────────┐
             │   READY   │
             └─────┬─────┘
                   │ driver picks up
                   ▼
           ┌─────────────────┐
           │   PICKED_UP     │
           └────────┬────────┘
                    │ driver on way
                    ▼
           ┌─────────────────┐
           │   ON_THE_WAY    │
           └────────┬────────┘
                    │ driver delivers
                    ▼
           ┌─────────────────┐
           │    DELIVERED    │  ◄── FINAL
           └─────────────────┘
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Callable

logger = logging.getLogger("wolfie.order_state")
UTC    = timezone.utc


# ══════════════════════════════════════════════════════════════════════════════
# 1. STATE ENUM
# ══════════════════════════════════════════════════════════════════════════════

class OrderState(str, Enum):
    PENDING     = "pending"
    ASSIGNED    = "assigned"
    ACCEPTED    = "accepted"
    PREPARING   = "preparing"
    READY       = "ready"
    PICKED_UP   = "picked_up"
    ON_THE_WAY  = "on_the_way"
    DELIVERED   = "delivered"
    CANCELLED   = "cancelled"

    # ── Helpers ──────────────────────────────

    @property
    def is_final(self) -> bool:
        return self in (OrderState.DELIVERED, OrderState.CANCELLED)

    @property
    def is_active(self) -> bool:
        return not self.is_final and self != OrderState.PENDING

    @property
    def label(self) -> str:
        return self.value.replace("_", " ").title()


FINAL_STATES  = {OrderState.DELIVERED, OrderState.CANCELLED}
ACTIVE_STATES = {
    OrderState.ASSIGNED, OrderState.ACCEPTED, OrderState.PREPARING,
    OrderState.READY,    OrderState.PICKED_UP, OrderState.ON_THE_WAY,
}


# ══════════════════════════════════════════════════════════════════════════════
# 2. ROLE ENUM
# ══════════════════════════════════════════════════════════════════════════════

class ActorRole(str, Enum):
    CUSTOMER   = "customer"
    DRIVER     = "driver"
    RESTAURANT = "restaurant"
    ADMIN      = "admin"
    SYSTEM     = "system"       # automated transitions (e.g. timeout)


# ══════════════════════════════════════════════════════════════════════════════
# 3. TRANSITION RULES
#    (from_state, to_state) → set of roles allowed to make this transition
# ══════════════════════════════════════════════════════════════════════════════

TransitionKey = tuple[OrderState, OrderState]

TRANSITION_RULES: dict[TransitionKey, set[ActorRole]] = {

    # PENDING ──────────────────────────────────────────────────────────────────
    (OrderState.PENDING,    OrderState.ASSIGNED):   {ActorRole.SYSTEM, ActorRole.ADMIN},
    (OrderState.PENDING,    OrderState.ACCEPTED):   {ActorRole.RESTAURANT, ActorRole.ADMIN},
    (OrderState.PENDING,    OrderState.CANCELLED):  {ActorRole.CUSTOMER, ActorRole.RESTAURANT,
                                                     ActorRole.ADMIN, ActorRole.SYSTEM},

    # ASSIGNED ─────────────────────────────────────────────────────────────────
    (OrderState.ASSIGNED,   OrderState.PENDING):    {ActorRole.DRIVER, ActorRole.ADMIN},
    (OrderState.ASSIGNED,   OrderState.ACCEPTED):   {ActorRole.RESTAURANT, ActorRole.ADMIN, ActorRole.DRIVER},
    (OrderState.ASSIGNED,   OrderState.CANCELLED):  {ActorRole.CUSTOMER, ActorRole.RESTAURANT,
                                                     ActorRole.ADMIN},

    # ACCEPTED ─────────────────────────────────────────────────────────────────
    (OrderState.ACCEPTED,   OrderState.PREPARING):  {ActorRole.RESTAURANT, ActorRole.ADMIN},
    (OrderState.ACCEPTED,   OrderState.CANCELLED):  {ActorRole.RESTAURANT, ActorRole.ADMIN},

    # PREPARING ────────────────────────────────────────────────────────────────
    (OrderState.PREPARING,  OrderState.READY):      {ActorRole.RESTAURANT, ActorRole.ADMIN},
    (OrderState.PREPARING,  OrderState.CANCELLED):  {ActorRole.RESTAURANT, ActorRole.ADMIN},

    # READY ────────────────────────────────────────────────────────────────────
    (OrderState.READY,      OrderState.PICKED_UP):  {ActorRole.DRIVER, ActorRole.ADMIN},
    (OrderState.READY,      OrderState.CANCELLED):  {ActorRole.ADMIN},

    # PICKED_UP ────────────────────────────────────────────────────────────────
    (OrderState.PICKED_UP,  OrderState.ON_THE_WAY): {ActorRole.DRIVER, ActorRole.ADMIN},

    # ON_THE_WAY ───────────────────────────────────────────────────────────────
    (OrderState.ON_THE_WAY, OrderState.DELIVERED):  {ActorRole.DRIVER, ActorRole.ADMIN},

    # FINAL STATES — no transitions out (enforced by is_final check)
}

# Flat set of valid transitions (ignoring roles) — for fast lookup
VALID_TRANSITIONS: set[TransitionKey] = set(TRANSITION_RULES.keys())


# ══════════════════════════════════════════════════════════════════════════════
# 4. TRANSITION RESULT
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class TransitionResult:
    success:       bool
    from_state:    OrderState
    to_state:      OrderState
    actor_role:    ActorRole
    timestamp:     datetime = field(default_factory=lambda: datetime.now(UTC))
    error:         str | None = None
    side_effects:  list[str] = field(default_factory=list)

    def raise_if_failed(self):
        if not self.success:
            raise OrderStateError(self.error or "Transition failed")


# ══════════════════════════════════════════════════════════════════════════════
# 5. EXCEPTIONS
# ══════════════════════════════════════════════════════════════════════════════

class OrderStateError(Exception):
    """Base exception for all state machine errors."""

class InvalidTransitionError(OrderStateError):
    """Transition path doesn't exist in TRANSITION_RULES."""

class UnauthorizedTransitionError(OrderStateError):
    """Actor role is not allowed for this transition."""

class FinalStateError(OrderStateError):
    """Attempted to transition from a final state."""


# ══════════════════════════════════════════════════════════════════════════════
# 6. STATE MANAGER
# ══════════════════════════════════════════════════════════════════════════════

class OrderStateManager:
    """
    Central authority for all order state transitions.

    Usage:
        manager = OrderStateManager()

        # Validate only (no side effects)
        manager.validate(from_state="pending", to_state="accepted", actor_role="restaurant")

        # Full transition (validates + executes + logs)
        result = manager.transition(
            order_id   = "abc-123",
            from_state = "pending",
            to_state   = "accepted",
            actor_id   = "rest_001",
            actor_role = "restaurant",
            context    = {"driver_id": "drv_001"},
        )
        result.raise_if_failed()
    """

    def __init__(self):
        # Optional hooks — register callbacks for side effects
        self._hooks: dict[OrderState, list[Callable]] = {s: [] for s in OrderState}

    # ── Validation ────────────────────────────────────────────────────────────

    def validate(
        self,
        from_state: str | OrderState,
        to_state:   str | OrderState,
        actor_role: str | ActorRole,
    ) -> None:
        """
        Raises an exception if the transition is invalid.
        Call this before writing anything to the DB.
        """
        current = self._parse_state(from_state)
        target  = self._parse_state(to_state)
        role    = self._parse_role(actor_role)

        # 1. Final state check
        if current.is_final:
            raise FinalStateError(
                f"Order is already {current.value} — no further transitions allowed"
            )

        # 2. Valid path check
        key = (current, target)
        if key not in VALID_TRANSITIONS:
            allowed = self._allowed_next(current)
            raise InvalidTransitionError(
                f"Cannot transition {current.value} → {target.value}. "
                f"Allowed next states: {[s.value for s in allowed]}"
            )

        # 3. Role permission check
        allowed_roles = TRANSITION_RULES[key]
        if role not in allowed_roles:
            raise UnauthorizedTransitionError(
                f"Role '{role.value}' cannot perform {current.value} → {target.value}. "
                f"Allowed roles: {[r.value for r in allowed_roles]}"
            )

    def can_transition(
        self,
        from_state: str | OrderState,
        to_state:   str | OrderState,
        actor_role: str | ActorRole,
    ) -> bool:
        """Non-raising version of validate()."""
        try:
            self.validate(from_state, to_state, actor_role)
            return True
        except OrderStateError:
            return False

    # ── Full transition ───────────────────────────────────────────────────────

    def transition(
        self,
        order_id:   str,
        from_state: str | OrderState,
        to_state:   str | OrderState,
        actor_id:   str,
        actor_role: str | ActorRole,
        context:    dict = None,
    ) -> TransitionResult:
        """
        Validates and records a state transition.
        Does NOT touch the DB — the caller (repository) handles persistence.
        Returns a TransitionResult; call .raise_if_failed() to surface errors.
        """
        current = self._parse_state(from_state)
        target  = self._parse_state(to_state)
        role    = self._parse_role(actor_role)

        try:
            self.validate(current, target, role)
        except OrderStateError as e:
            logger.warning(
                f"BLOCKED transition [{order_id}] "
                f"{current.value} → {target.value} by {role.value}: {e}"
            )
            return TransitionResult(
                success    = False,
                from_state = current,
                to_state   = target,
                actor_role = role,
                error      = str(e),
            )

        side_effects = self._side_effect_labels(current, target)

        logger.info(
            f"ORDER [{order_id}] {current.value} → {target.value} "
            f"by {role.value} ({actor_id})"
        )

        result = TransitionResult(
            success      = True,
            from_state   = current,
            to_state     = target,
            actor_role   = role,
            side_effects = side_effects,
        )

        # Fire registered hooks
        for hook in self._hooks.get(target, []):
            try:
                hook(order_id=order_id, result=result, context=context or {})
            except Exception as e:
                logger.error(f"Hook failed on {target.value}: {e}")

        return result

    # ── Query helpers ─────────────────────────────────────────────────────────

    def allowed_next_states(
        self,
        from_state: str | OrderState,
        actor_role: str | ActorRole,
    ) -> list[OrderState]:
        """Return states this actor can move to from the current state."""
        current = self._parse_state(from_state)
        role    = self._parse_role(actor_role)

        if current.is_final:
            return []

        return [
            to for (frm, to), roles in TRANSITION_RULES.items()
            if frm == current and role in roles
        ]

    def get_transition_map(self) -> dict:
        """Full transition map — useful for frontend to render UI buttons."""
        result = {}
        for (frm, to), roles in TRANSITION_RULES.items():
            result.setdefault(frm.value, []).append({
                "to":    to.value,
                "roles": [r.value for r in roles],
            })
        return result

    # ── Hook registration ─────────────────────────────────────────────────────

    def on_state(self, state: OrderState):
        """
        Decorator to register a hook that fires after entering a state.

        Usage:
            @manager.on_state(OrderState.DELIVERED)
            def notify_customer(order_id, result, context):
                push.send(...)
        """
        def decorator(fn: Callable):
            self._hooks[state].append(fn)
            return fn
        return decorator

    # ── Timestamps ────────────────────────────────────────────────────────────

    @staticmethod
    def timestamp_fields(to_state: str | OrderState) -> dict:
        """
        Returns DB fields to set when entering this state.
        Merge into your update payload.
        """
        state  = OrderState(to_state) if isinstance(to_state, str) else to_state
        now    = datetime.now(UTC)
        fields = {"status": state.value, "updated_at": now}

        if state == OrderState.PICKED_UP:
            fields["picked_up_at"] = now
        elif state == OrderState.DELIVERED:
            fields["delivered_at"] = now

        return fields

    # ── Internal ─────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_state(value: str | OrderState) -> OrderState:
        try:
            return OrderState(value) if isinstance(value, str) else value
        except ValueError:
            valid = [s.value for s in OrderState]
            raise InvalidTransitionError(
                f"Unknown state: '{value}'. Valid: {valid}"
            )

    @staticmethod
    def _parse_role(value: str | ActorRole) -> ActorRole:
        try:
            return ActorRole(value) if isinstance(value, str) else value
        except ValueError:
            valid = [r.value for r in ActorRole]
            raise UnauthorizedTransitionError(
                f"Unknown role: '{value}'. Valid: {valid}"
            )

    @staticmethod
    def _allowed_next(state: OrderState) -> list[OrderState]:
        return [to for (frm, to) in VALID_TRANSITIONS if frm == state]

    @staticmethod
    def _side_effect_labels(frm: OrderState, to: OrderState) -> list[str]:
        """Human-readable side effects to trigger after this transition."""
        effects: dict[tuple, list[str]] = {
            (OrderState.PENDING,    OrderState.ASSIGNED):   ["notify_restaurant", "notify_driver"],
            (OrderState.PENDING,    OrderState.ACCEPTED):   ["notify_customer"],
            (OrderState.ASSIGNED,   OrderState.ACCEPTED):   ["notify_customer"],
            (OrderState.ACCEPTED,   OrderState.PREPARING):  ["notify_customer"],
            (OrderState.PREPARING,  OrderState.READY):      ["notify_driver", "notify_customer"],
            (OrderState.READY,      OrderState.PICKED_UP):  ["notify_customer", "start_tracking"],
            (OrderState.PICKED_UP,  OrderState.ON_THE_WAY): ["notify_customer", "update_eta"],
            (OrderState.ON_THE_WAY, OrderState.DELIVERED):  ["notify_customer", "trigger_payment",
                                                             "create_payouts", "request_rating"],
            (OrderState.PENDING,    OrderState.CANCELLED):  ["notify_restaurant", "refund_if_paid"],
            (OrderState.ASSIGNED,   OrderState.PENDING):    ["reassign_driver", "log_driver_decline"],
            (OrderState.ASSIGNED,   OrderState.CANCELLED):  ["notify_restaurant",
                                                             "refund_if_paid"],
            (OrderState.ACCEPTED,   OrderState.CANCELLED):  ["notify_customer", "refund_if_paid"],
            (OrderState.PREPARING,  OrderState.CANCELLED):  ["notify_customer", "notify_driver",
                                                             "refund_if_paid"],
        }
        return effects.get((frm, to), [])


# ══════════════════════════════════════════════════════════════════════════════
# 7. SINGLETON  — import this everywhere
# ══════════════════════════════════════════════════════════════════════════════

order_state_manager = OrderStateManager()


# ══════════════════════════════════════════════════════════════════════════════
# 8. CONVENIENCE FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def validate_transition(from_state: str, to_state: str, actor_role: str) -> None:
    """Raises OrderStateError if transition is invalid. Use in routes."""
    order_state_manager.validate(from_state, to_state, actor_role)


def get_allowed_transitions(from_state: str, actor_role: str) -> list[str]:
    """Return list of state strings this actor can move to."""
    states = order_state_manager.allowed_next_states(from_state, actor_role)
    return [s.value for s in states]


def build_status_update(to_state: str) -> dict:
    """
    Build the DB update payload for a state transition.

    Usage:
        updates = build_status_update("delivered")
        # → {"status": "delivered", "updated_at": "...", "delivered_at": "..."}
        repo.update(order, **updates)
    """
    return order_state_manager.timestamp_fields(to_state)
