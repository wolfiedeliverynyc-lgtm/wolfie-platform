# Wolfie Delivery — API Reference

> **Base URL:** `http://localhost:5000/api/v1`
> **Auth:** Bearer token via `Authorization: Bearer <access_token>`
> **Content-Type:** `application/json` (all requests)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Restaurants (Public)](#2-restaurants-public)
3. [Orders](#3-orders)
4. [Payments](#4-payments)
5. [Drivers](#5-drivers)
6. [Tracking](#6-tracking)
7. [Chat](#7-chat)
8. [Notifications](#8-notifications)
9. [Ratings](#9-ratings)
10. [Addresses](#10-addresses)
11. [Favorites](#11-favorites)
12. [Admin](#12-admin)
13. [Testing Utilities](#13-testing-utilities-dev-only)

---

## 1. Authentication

All auth routes are at `/api/v1/auth`.

---

### POST `/auth/register`

Create a new user account.

**Auth required:** ❌ No

**Request body:**
```json
{
  "email":     "user@example.com",
  "password":  "MyPassword123!",
  "full_name": "Jane Doe",
  "phone":     "+12125550001",
  "role":      "customer"
}
```

> **`role`** must be one of: `customer`, `driver`, `restaurant`

**Response `201`:**
```json
{
  "message":       "Account created",
  "user_id":       "uuid-here",
  "role":          "customer",
  "access_token":  "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in":    86400
}
```

**Response `400`:** Missing fields or duplicate email/phone.

---

### POST `/auth/login`

Login with email and password.

**Auth required:** ❌ No

**Request body:**
```json
{
  "email":    "user@example.com",
  "password": "MyPassword123!"
}
```

**Response `200`:**
```json
{
  "user_id":       "uuid-here",
  "role":          "customer",
  "full_name":     "Jane Doe",
  "access_token":  "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in":    86400
}
```

**Response `401`:** Invalid email or password.
**Response `403`:** Account deactivated.

---

### POST `/auth/refresh`

Exchange a refresh token for a new access token.

**Auth required:** ❌ No

**Request body:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response `200`:**
```json
{
  "access_token":  "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in":    86400
}
```

**Response `400`:** Missing token.
**Response `401`:** Invalid or expired refresh token.

---

### POST `/auth/logout`

Logout (client-side token invalidation).

**Auth required:** ❌ No (token is stateless)

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

### GET `/auth/me`

Get the authenticated user's profile.

**Auth required:** ✅ Yes (any role)

**Response `200`:**
```json
{
  "id":         "uuid",
  "email":      "user@example.com",
  "full_name":  "Jane Doe",
  "phone":      "+12125550001",
  "role":       "customer",
  "is_active":  true,
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

### PATCH `/auth/me`

Update profile fields.

**Auth required:** ✅ Yes (any role)

**Request body (all optional):**
```json
{
  "full_name":            "Jane Updated",
  "phone":                "+12125550099",
  "dietary_preferences":  ["vegan", "gluten-free"],
  "allergy_preferences":  ["nuts"],
  "password":             "NewPassword456!"
}
```

**Response `200`:**
```json
{ "message": "Profile updated" }
```

---

### POST `/auth/otp/send`

Send a 6-digit OTP to a phone number.

**Auth required:** ❌ No

**Request body:**
```json
{ "phone": "+12125550001" }
```

**Response `200` (dev/mock mode):**
```json
{ "message": "OTP sent", "mock_code": "482910" }
```

> ⚠️ In production (`MOCK_SMS=false`) the `mock_code` field is omitted.

---

### POST `/auth/otp/verify`

Verify a 6-digit OTP.

**Auth required:** ❌ No

**Request body:**
```json
{
  "phone": "+12125550001",
  "code":  "482910"
}
```

> 💡 In dev mode, the code `123456` is always accepted as a fallback.

**Response `200`:**
```json
{ "verified": true, "message": "OTP verified" }
```

**Response `400`:**
```json
{ "verified": false, "error": "Invalid or expired OTP" }
```

---

## 2. Restaurants (Public)

> **No authentication required for browsing.**

---

### GET `/restaurants/`

List all active restaurants.

**Auth required:** ❌ No

**Response `200`:**
```json
{
  "restaurants": [
    {
      "id":               "uuid",
      "restaurant_name":  "Wolfie Test Kitchen",
      "is_open":          true,
      "category":         "American",
      "price_level":      2,
      "delivery_fee":     3.99,
      "delivery_time_min":25,
      "address":          "123 Main St, New York",
      "latitude":         40.7128,
      "longitude":        -74.0060,
      "busy_mode":        false
    }
  ],
  "count": 1
}
```

---

### GET `/restaurants/<restaurant_id>`

Get a single restaurant's details.

**Auth required:** ❌ No

**Response `200`:** Same shape as one item from the list above.
**Response `404`:** Restaurant not found.

---

### GET `/restaurants/<restaurant_id>/menu`

Get the available menu items for a restaurant.

**Auth required:** ❌ No

**Response `200`:**
```json
{
  "menu": [
    {
      "id":           "uuid",
      "name":         "Classic Burger",
      "description":  "Beef patty, lettuce, tomato, pickles",
      "price":        12.99,
      "category":     "Burgers",
      "is_available": true,
      "image_url":    null,
      "sizes":        []
    }
  ],
  "count": 1
}
```

---

### GET `/restaurants/menu` *(Restaurant owner only)*

List all menu items for the authenticated restaurant (including unavailable).

**Auth required:** ✅ Yes (`restaurant` role)

**Query params:**
- `restaurant_id` — optionally fetch another restaurant's menu (admin/customer)

---

### POST `/restaurants/menu`

Add a new menu item.

**Auth required:** ✅ Yes (`restaurant`)

**Request body:**
```json
{
  "name":        "Spicy Wings",
  "price":       11.99,
  "category":    "Snacks",
  "description": "12 pieces, buffalo sauce",
  "image_url":   "https://...",
  "is_available":true,
  "sizes":       []
}
```

**Response `201`:**
```json
{ "id": "new-uuid", "message": "Item added" }
```

---

## 3. Orders

> All order routes require authentication.

---

### POST `/orders/quote`

Get a delivery price quote before placing an order.

**Auth required:** ❌ No

**Request body:**
```json
{
  "pickup_address":   "123 Main St, New York",
  "delivery_address": "456 Park Ave, New York",
  "items": [
    { "price": 12.99, "quantity": 2 }
  ]
}
```

**Response `200`:**
```json
{
  "quote": {
    "subtotal":     25.98,
    "delivery_fee": 4.49,
    "service_fee":  3.49,
    "tax":          2.31,
    "total":        36.27
  },
  "route": { "distance_km": 2.1, "duration_min": 18 },
  "expires_in": 300
}
```

---

### POST `/orders/`

Place a new order.

**Auth required:** ❌ No (customer_id passed in body; use authenticated customer's ID)

**Request body:**
```json
{
  "customer_id":      "test-cust-0000-0000-000000000002",
  "restaurant_id":    "test-rest-0000-0000-000000000003",
  "items": [
    { "id": "test-menu-0000-0000-000000000005", "quantity": 1 }
  ],
  "pickup_address":   "123 Test Street, New York",
  "delivery_address": "789 Delivery Ave, New York",
  "payment_method":   "cash"
}
```

> **`payment_method`** must be `cash` or `stripe`

**Response `201`:**
```json
{
  "order_id":  "uuid",
  "status":    "pending",
  "pricing":   { "subtotal": 12.99, "total": 21.47, "..." : "..." },
  "eta_min":   18,
  "driver":    null
}
```

**Response `400`:** Missing fields, restaurant closed, or invalid menu item.
**Response `404`:** Restaurant not found.

---

### GET `/orders/<order_id>`

Get a single order. Returns 403 if the user doesn't own/manage it.

**Auth required:** ✅ Yes (`customer`, `driver`, `restaurant`, `admin`)

---

### PATCH `/orders/<order_id>/status`

Advance an order through its state machine.

**Auth required:** ✅ Yes (`driver`, `restaurant`, `admin`)

**Request body:**
```json
{ "status": "accepted" }
```

> **Valid statuses by actor:**
> - `restaurant` → `accepted`, `ready`
> - `driver` → `picked_up`, `delivered`
> - `admin` → any status

**Response `200`:**
```json
{ "order_id": "uuid", "status": "accepted" }
```

---

### GET `/orders/customer/<customer_id>`

Get all orders for a specific customer.

**Auth required:** ✅ Yes (`customer` — own ID only, or `admin`)

**Query params:** `limit` (default 20), `offset` (default 0)

---

## 4. Payments

---

### POST `/payments/create-intent`

Create a Stripe payment intent for an order.

**Auth required:** ✅ Yes (`customer`)

**Request body:**
```json
{ "order_id": "uuid" }
```

**Response `200`:**
```json
{
  "client_secret":      "pi_xxx_secret_xxx",
  "payment_intent_id":  "pi_xxx",
  "amount":             2147
}
```

> ⚠️ In mock mode (`MOCK_PAYMENT=true`), Stripe is called with `sk_test_mock` — this will return a Stripe error in real calls. Use a real test key for end-to-end payment testing.

---

### POST `/payments/confirm-cash`

Confirm cash payment for a delivered cash order.

**Auth required:** ✅ Yes (`driver`)

**Request body:**
```json
{ "order_id": "uuid" }
```

---

### POST `/payments/webhook`

Stripe webhook handler.

**Auth required:** ❌ No (verified via `Stripe-Signature` header)

---

### GET `/payments/driver/earnings`

Get driver payout summary.

**Auth required:** ✅ Yes (`driver`, `admin`)

---

### GET `/payments/restaurant/payouts`

Get restaurant payout summary.

**Auth required:** ✅ Yes (`restaurant`, `admin`)

---

## 5. Drivers

---

### PATCH `/drivers/status`

Update driver availability.

**Auth required:** ✅ Yes (`driver`)

**Request body:**
```json
{ "is_available": true }
```

---

### POST `/drivers/location`

Push driver GPS coordinates.

**Auth required:** ✅ Yes (`driver`)

**Request body:**
```json
{
  "lat":      40.7128,
  "lng":      -74.0060,
  "order_id": "uuid-or-null"
}
```

**Response `200`:**
```json
{ "status": "ok" }
```

> Anti-teleportation: jumps > 500m from last known position are rejected.

---

### GET `/drivers/active-order`

Get the driver's currently active order.

**Auth required:** ✅ Yes (`driver`)

---

### GET `/drivers/earnings`

Get the driver's total delivery earnings.

**Auth required:** ✅ Yes (`driver`)

---

### GET `/drivers/orders/history`

Get a driver's delivery history.

**Auth required:** ✅ Yes (`driver`)

**Query params:** `limit` (default 20), `offset` (default 0)

---

## 6. Tracking

---

### GET `/tracking/<order_id>`

Get live tracking info for an order.

**Auth required:** ✅ Yes (`customer`, `driver`, `restaurant`, `admin`)

**Response `200`:**
```json
{
  "order_id":  "uuid",
  "status":    "in_transit",
  "driver": {
    "id":  "uuid",
    "lat": 40.7130,
    "lng": -74.0050
  }
}
```

---

## 7. Chat

---

### GET `/chat/<order_id>`

Get all chat messages for an order.

**Auth required:** ✅ Yes

---

### POST `/chat/<order_id>`

Send a chat message.

**Auth required:** ✅ Yes

**Request body:**
```json
{
  "message":     "I am 2 minutes away!",
  "sender_type": "driver"
}
```

---

## 8. Notifications

---

### GET `/notifications`

Get notifications for the current user.

**Auth required:** ✅ Yes

**Query params:** `limit` (default 20), `unread_only` (bool)

---

### PATCH `/notifications/<id>/read`

Mark a notification as read.

**Auth required:** ✅ Yes

---

## 9. Ratings

---

### POST `/ratings`

Submit a rating for an order.

**Auth required:** ✅ Yes (`customer`)

**Request body:**
```json
{
  "order_id":  "uuid",
  "rating":    5,
  "comment":   "Amazing food!",
  "target":    "restaurant"
}
```

---

### GET `/ratings/<restaurant_id>`

Get all ratings for a restaurant.

**Auth required:** ❌ No

---

## 10. Addresses

---

### GET `/addresses`

Get saved delivery addresses for the current user.

**Auth required:** ✅ Yes

---

### POST `/addresses`

Save a new delivery address.

**Auth required:** ✅ Yes

**Request body:**
```json
{
  "label":   "Home",
  "address": "123 Park Ave, New York, NY 10001",
  "lat":     40.7128,
  "lng":     -74.0060
}
```

---

## 11. Favorites

---

### GET `/favorites`

Get the current user's favorite restaurants.

**Auth required:** ✅ Yes

---

### POST `/favorites`

Add a restaurant to favorites.

**Auth required:** ✅ Yes

**Request body:**
```json
{ "restaurant_id": "uuid" }
```

---

### DELETE `/favorites/<restaurant_id>`

Remove a restaurant from favorites.

**Auth required:** ✅ Yes

---

## 12. Admin

All admin routes require `admin` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users |
| GET | `/admin/users/<id>` | Get user detail |
| PATCH | `/admin/users/<id>` | Update user |
| GET | `/admin/orders` | List all orders |
| POST | `/admin/refunds` | Issue a refund |
| GET | `/admin/analytics/dashboard` | Platform metrics |
| GET | `/admin/fraud/flags` | Fraud flags |
| GET | `/admin/logs` | Audit logs |

---

## 13. Testing Utilities *(Dev only)*

> ⚠️ Only available when `FLASK_ENV=development` or `testing`.

---

### DELETE `/testing/reset`

Wipes all test fixture records and re-seeds fresh test data.

**Auth required:** ❌ No

**Response `200`:**
```json
{
  "message": "Test data reset and re-seeded successfully",
  "test_credentials": {
    "admin":      { "email": "test.admin@wolfie.delivery",      "password": "TestPassword123!" },
    "customer":   { "email": "test.customer@wolfie.delivery",   "password": "TestPassword123!" },
    "restaurant": { "email": "test.restaurant@wolfie.delivery", "password": "TestPassword123!" },
    "driver":     { "email": "test.driver@wolfie.delivery",     "password": "TestPassword123!" }
  },
  "test_ids": {
    "admin":       "test-admin-0000-0000-000000000001",
    "customer":    "test-cust-0000-0000-000000000002",
    "restaurant":  "test-rest-0000-0000-000000000003",
    "driver":      "test-drvr-0000-0000-000000000004",
    "menu_item_1": "test-menu-0000-0000-000000000005",
    "menu_item_2": "test-menu-0000-0000-000000000006",
    "menu_item_3": "test-menu-0000-0000-000000000007"
  }
}
```

---

### GET `/testing/status`

Check whether test fixtures currently exist.

**Auth required:** ❌ No

**Response `200`:**
```json
{
  "seeded": true,
  "fixtures": {
    "admin":       true,
    "customer":    true,
    "restaurant":  true,
    "driver":      true,
    "menu_item_1": true,
    "menu_item_2": true,
    "menu_item_3": true
  },
  "environment": "development"
}
```

---

## Error Format

All error responses follow this shape:

```json
{ "error": "Human-readable error message" }
```

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request (missing/invalid fields) |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient permissions or compliance block) |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## WebSocket Events

Connect via Socket.IO to `ws://localhost:5000` with optional auth token:

```js
const socket = io("http://localhost:5000", {
  auth: { token: "<access_token>" }
});
```

| Event (client → server) | Payload | Description |
|--------------------------|---------|-------------|
| `join_order` | `{ order_id }` | Subscribe to order room |
| `leave_order` | `{ order_id }` | Unsubscribe from order room |
| `join_restaurant` | `{ restaurant_id }` | Subscribe to restaurant room |
| `driver_location_update` | `{ order_id, lat, lng, driver_id }` | Push driver GPS |
| `order_chat` | `{ order_id, message, sender_type, sender_id }` | Send chat message |

| Event (server → client) | Payload | Description |
|--------------------------|---------|-------------|
| `order_status_update` | `{ order_id, status }` | Order status changed |
| `driver_location` | `{ driver_id, lat, lng }` | Driver moved |
| `chat_message` | `{ message, sender, sender_id }` | New chat message |
| `incoming_order` | order object | New order (restaurant) |
| `order_created` | `{ order_id, status, total, eta }` | Order confirmed |
