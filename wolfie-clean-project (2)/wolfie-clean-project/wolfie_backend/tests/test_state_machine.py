"""WOLFIE DELIVERY — test_state_machine.py"""

import pytest, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from order_state_manager import (
    OrderStateManager, OrderState, ActorRole,
    InvalidTransitionError, UnauthorizedTransitionError, FinalStateError,
    validate_transition, get_allowed_transitions, build_status_update,
)

@pytest.fixture
def manager():
    return OrderStateManager()

class TestValidTransitions:
    def test_pending_to_accepted_restaurant(self, manager):
        manager.validate("pending", "accepted", "restaurant")

    def test_pending_to_assigned_system(self, manager):
        manager.validate("pending", "assigned", "system")

    def test_ready_to_picked_up_driver(self, manager):
        manager.validate("ready", "picked_up", "driver")

    def test_on_the_way_to_delivered_driver(self, manager):
        manager.validate("on_the_way", "delivered", "driver")

    def test_admin_can_do_any(self, manager):
        manager.validate("pending", "accepted", "admin")
        manager.validate("ready", "picked_up", "admin")
        manager.validate("pending", "cancelled", "admin")

class TestInvalidTransitions:
    def test_pending_to_delivered_blocked(self, manager):
        with pytest.raises(InvalidTransitionError):
            manager.validate("pending", "delivered", "driver")

    def test_delivered_is_final(self, manager):
        with pytest.raises(FinalStateError):
            manager.validate("delivered", "cancelled", "admin")

    def test_cancelled_is_final(self, manager):
        with pytest.raises(FinalStateError):
            manager.validate("cancelled", "pending", "admin")

    def test_unknown_status(self, manager):
        with pytest.raises(InvalidTransitionError):
            manager.validate("flying", "delivered", "driver")

class TestRolePermissions:
    def test_customer_cannot_accept(self, manager):
        with pytest.raises(UnauthorizedTransitionError):
            manager.validate("pending", "accepted", "customer")

    def test_driver_cannot_accept(self, manager):
        with pytest.raises(UnauthorizedTransitionError):
            manager.validate("pending", "accepted", "driver")

    def test_restaurant_cannot_deliver(self, manager):
        with pytest.raises(UnauthorizedTransitionError):
            manager.validate("on_the_way", "delivered", "restaurant")

    def test_restaurant_cannot_pick_up(self, manager):
        with pytest.raises(UnauthorizedTransitionError):
            manager.validate("ready", "picked_up", "restaurant")

class TestTransitionResult:
    def test_success(self, manager):
        result = manager.transition("ord_1", "pending", "accepted", "rest_1", "restaurant")
        assert result.success is True
        assert result.from_state == OrderState.PENDING
        assert result.to_state   == OrderState.ACCEPTED

    def test_failure(self, manager):
        result = manager.transition("ord_1", "pending", "delivered", "drv_1", "driver")
        assert result.success is False

    def test_raise_if_failed(self, manager):
        result = manager.transition("ord_1", "delivered", "cancelled", "adm_1", "admin")
        with pytest.raises(Exception):
            result.raise_if_failed()

class TestSideEffects:
    def test_delivered_side_effects(self, manager):
        result = manager.transition("ord_1", "on_the_way", "delivered", "drv_1", "driver")
        assert "trigger_payment" in result.side_effects
        assert "create_payouts"  in result.side_effects
        assert "request_rating"  in result.side_effects

    def test_assigned_side_effects(self, manager):
        result = manager.transition("ord_1", "pending", "assigned", "sys", "system")
        assert "notify_restaurant" in result.side_effects
        assert "notify_driver"     in result.side_effects

class TestHelpers:
    def test_final_state_no_transitions(self, manager):
        assert manager.allowed_next_states("delivered", "admin") == []
        assert manager.allowed_next_states("cancelled", "admin") == []

    def test_build_delivered(self):
        u = build_status_update("delivered")
        assert u["status"] == "delivered"
        assert "delivered_at" in u

    def test_build_picked_up(self):
        u = build_status_update("picked_up")
        assert "picked_up_at" in u

    def test_is_final(self):
        assert OrderState.DELIVERED.is_final is True
        assert OrderState.PENDING.is_final   is False

    def test_convenience_functions(self, manager):
        validate_transition("pending", "accepted", "restaurant")
        allowed = get_allowed_transitions("ready", "driver")
        assert "picked_up" in allowed
