from functools import wraps
from flask import request, jsonify
from pydantic import BaseModel, Field, field_validator, ValidationError
from typing import List, Optional
import re

# Decorator for request body validation
def validate_request(schema_cls):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            data = request.get_json(silent=True) or {}
            try:
                # Validate using Pydantic
                validated = schema_cls(**data)
                # Attach validated object to request context
                request.validated_data = validated
            except ValidationError as e:
                # Return 400 Bad Request with validation errors
                errors = e.errors()
                formatted_errors = []
                for err in errors:
                    formatted_errors.append({
                        "field": ".".join(str(p) for p in err["loc"]),
                        "message": err["msg"]
                    })
                return jsonify({"error": "Validation failed", "details": formatted_errors}), 400
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── SCHEMAS ──

class OrderItemSchema(BaseModel):
    id: Optional[str] = Field(None, alias="menu_item_id")
    name: Optional[str] = None
    price: float = Field(..., gt=0, description="Price must be positive")
    quantity: int = Field(..., ge=1, description="Quantity must be at least 1")

    # Support reading using both name and alias
    model_config = {
        "populate_by_name": True
    }


class OrderCreateSchema(BaseModel):
    restaurant_id: str
    items: List[OrderItemSchema] = Field(..., min_length=1, description="Order must contain at least one item")
    delivery_address: str
    pickup_address: Optional[str] = None
    payment_method: Optional[str] = "stripe"
    customer_id: Optional[str] = None
    promo_code: Optional[str] = None

    @field_validator("payment_method")
    def validate_payment_method(cls, v):
        valid = {"cash", "stripe", "card"}
        if v and v.lower() not in valid:
            raise ValueError(f"payment_method must be one of {valid}")
        return v.lower() if v else v


class UserRegisterSchema(BaseModel):
    email: str
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: str = Field(..., min_length=1, description="Full name cannot be empty")
    phone: str = Field(..., min_length=1, description="Phone number cannot be empty")
    role: str

    @field_validator("email")
    def validate_email(cls, v):
        pattern = r"^[^@]+@[^@]+\.[^@]+$"
        if not re.match(pattern, v):
            raise ValueError("Invalid email format")
        return v.lower().strip()

    @field_validator("role")
    def validate_role(cls, v):
        valid = {"customer", "driver", "restaurant"}
        if v.lower() not in valid:
            raise ValueError(f"role must be one of {valid}")
        return v.lower()


class UserLoginSchema(BaseModel):
    email: str = Field(..., min_length=1, description="Email is required")
    password: str = Field(..., min_length=1, description="Password is required")


class RefundCreateSchema(BaseModel):
    order_id: str
    amount: float = Field(..., gt=0, description="Refund amount must be positive")
    refund_type: str = Field(..., min_length=1, description="Refund type is required")


class PartialRefundSchema(BaseModel):
    amount: float = Field(..., gt=0, description="Refund amount must be positive")


class RefundPaymentSchema(BaseModel):
    order_id: str


class CreateIntentSchema(BaseModel):
    order_id: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0, description="Amount must be positive")
    currency: Optional[str] = "usd"

    @field_validator("currency")
    def validate_currency(cls, v):
        valid = {"usd", "eur", "dzd"}
        if v and v.lower() not in valid:
            raise ValueError(f"currency must be one of {valid}")
        return v.lower() if v else v

