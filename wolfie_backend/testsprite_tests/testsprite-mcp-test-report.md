# TestSprite AI Backend Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** wolfie_backend
- **Date:** 2026-07-09
- **Prepared by:** TestSprite AI Team & Antigravity Assistant
- **Backend Stack:** Python · Flask · SQLAlchemy · SQLite (dev) · Flask-SocketIO · Stripe (mock) · Celery
- **API Base URL:** `http://localhost:5000/api/v1`
- **Test Run:** 10 tests, 1 passed, 9 failed

---

## 2️⃣ Requirement Validation Summary

### 🔑 Requirement Group 1: Authentication

#### ✅ TC005 — POST /api/v1/auth/logout with valid access token
- **Test Code:** [TC005_post_apiv1authlogout_with_valid_access_token.py](./testsprite_tests/TC005_post_apiv1authlogout_with_valid_access_token.py)
- **Status:** ✅ **PASSED**
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/dd1cb067-7d03-49f2-a5fd-82adf45b7eb3
- **Analysis:** Logout endpoint correctly handles token invalidation and returns a successful response.

---

#### ❌ TC001 — POST /api/v1/auth/register with valid data
- **Test Code:** [TC001_post_apiv1authregister_with_valid_data.py](./testsprite_tests/TC001_post_apiv1authregister_with_valid_data.py)
- **Status:** ❌ **FAILED** — Expected `201`, got `400`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/3bfda13b-6bd0-4f6a-8980-7e84eb690e29
- **Root Cause:** The registration endpoint rejected the request body with a 400 Bad Request. Likely causes:
  - Missing required fields (e.g. `role` or `password_confirm`)
  - Phone number format validation failure (expects E.164 format like `+1234567890`)
  - Email uniqueness constraint collision on re-runs
- **Fix Needed:** Review `routes/auth.py` registration validator. Add test-safe seed data cleanup between runs.

---

#### ❌ TC002 — POST /api/v1/auth/login with valid credentials
- **Test Code:** [TC002_post_apiv1authlogin_with_valid_credentials.py](./testsprite_tests/TC002_post_apiv1authlogin_with_valid_credentials.py)
- **Status:** ❌ **FAILED** — Expected `200`, got `401`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/5281fea9-0a7a-4e43-b1c4-703865d12697
- **Root Cause:** Login failed with 401 Unauthorized. Since TC001 (registration) also failed, the test user likely doesn't exist in the database. Additionally, accounts may require OTP phone verification before login is permitted.
- **Fix Needed:** Ensure test user (`wendys@wolfie.delivery`) exists in the dev DB via a seed script, or allow login before OTP verification is complete.

---

#### ❌ TC003 — POST /api/v1/auth/verify-otp with correct OTP
- **Test Code:** [TC003_post_apiv1authverifyotp_with_correct_otp.py](./testsprite_tests/TC003_post_apiv1authverifyotp_with_correct_otp.py)
- **Status:** ❌ **FAILED** — `404` on OTP verification endpoint
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/137fe3bf-48b7-4fdc-bdf8-b0d61237539a
- **Root Cause:** The OTP verification route returned 404 — suggesting the path `/api/v1/auth/verify-otp` may not match the actual registered route. Actual route may be `/api/v1/auth/verify_otp` or `/api/v1/auth/otp/verify`.
- **Fix Needed:** Confirm the exact route path in `routes/auth.py` and update the code summary accordingly.

---

#### ❌ TC004 — POST /api/v1/auth/refresh with valid refresh token
- **Test Code:** [TC004_post_apiv1authrefresh_with_valid_refresh_token.py](./testsprite_tests/TC004_post_apiv1authrefresh_with_valid_refresh_token.py)
- **Status:** ❌ **FAILED** — Expected `200`, got `400`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/d8330fa1-c88c-4460-a8be-f9c7c9331be3
- **Root Cause:** Token refresh returned 400. The test likely sent an invalid or expired refresh token (dependent on TC002 login succeeding). The request body format may also be wrong (e.g. `refresh_token` vs `token`).
- **Fix Needed:** Ensure refresh token is passed in the correct field name and that the login chain works first.

---

### 🍔 Requirement Group 2: Restaurant Management

#### ❌ TC006 — GET /api/v1/restaurants returns active restaurants
- **Test Code:** [TC006_get_apiv1restaurants_returns_active_restaurants.py](./testsprite_tests/TC006_get_apiv1restaurants_returns_active_restaurants.py)
- **Status:** ❌ **FAILED** — Expected `200`, got `401`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/7d646cf2-3482-47db-89ca-e5287d146648
- **Root Cause:** The `/api/v1/restaurants` endpoint requires authentication, but the code summary declared `auth_required: false`. The backend is protecting this route with JWT middleware unexpectedly.
- **Fix Needed:** Either make the restaurants listing public (no auth required for browsing), or update the code_summary.yaml to reflect `auth_required: true` so tests include an Authorization header.

---

### 📦 Requirement Group 3: Order Management

#### ❌ TC007 — POST /api/v1/orders places a new order
- **Test Code:** [TC007_post_apiv1orders_places_new_order.py](./testsprite_tests/TC007_post_apiv1orders_places_new_order.py)
- **Status:** ❌ **FAILED** — `404` on `/api/v1/restaurants/<id>/menu`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/770ece44-a34a-4299-b12b-01946c006aea
- **Root Cause:** The test fetched a restaurant ID from the restaurant list, then tried to fetch its menu at `/api/v1/restaurants/<id>/menu` but received 404. The menu endpoint path may not exist or use a different path structure (e.g. items embedded in the restaurant detail response).
- **Fix Needed:** Confirm the correct menu endpoint path in `routes/restaurants.py`. May need to update the code summary to reflect the correct path.

---

### 💳 Requirement Group 4: Payment Processing

#### ❌ TC008 — POST /api/v1/payments/create-intent with valid amount and currency
- **Test Code:** [TC008_post_apiv1paymentscreateintent_with_valid_amount_and_currency.py](./testsprite_tests/TC008_post_apiv1paymentscreateintent_with_valid_amount_and_currency.py)
- **Status:** ❌ **FAILED** — Expected `200`, got `400`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/bd81c905-dea9-4578-80d1-6320fec2a0ac
- **Root Cause:** Payment intent creation returned 400. Since `MOCK_PAYMENT=true`, the mock handler may require an `order_id` or `items` in the body — not just `amount` and `currency`. The test sent a minimal payload.
- **Fix Needed:** Review `routes/payments.py` to confirm the exact required body schema for payment intent creation.

---

### 🛵 Requirement Group 5: Driver Management

#### ❌ TC009 — PATCH /api/v1/drivers/<id>/location updates driver location
- **Test Code:** [TC009_patch_apiv1driversidlocation_updates_driver_location.py](./testsprite_tests/TC009_patch_apiv1driversidlocation_updates_driver_location.py)
- **Status:** ❌ **FAILED** — `404` on `/api/v1/drivers/available`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/538e46b6-4403-47f3-97ee-28bd279a9e88
- **Root Cause:** The test tried to find a driver via `GET /api/v1/drivers/available` but received 404. The "available drivers" listing endpoint may not exist, or is at a different path, or requires admin role.
- **Fix Needed:** Verify the correct path for listing drivers in `routes/drivers.py`.

---

### 🗺️ Requirement Group 6: Live Tracking

#### ❌ TC010 — GET /api/v1/tracking/<order_id> returns live tracking info
- **Test Code:** [TC010_get_apiv1trackingorderid_returns_live_tracking_info.py](./testsprite_tests/TC010_get_apiv1trackingorderid_returns_live_tracking_info.py)
- **Status:** ❌ **FAILED** — `404` on `/api/v1/orders`
- **Result URL:** https://www.testsprite.com/dashboard/mcp/tests/46b854dc-897c-4c4c-8dd0-5c38fef079ff/582748bc-2458-43a2-9ef7-b8a2c1ff63bb
- **Root Cause:** To get tracking info, the test first needed an active order ID. `GET /api/v1/orders` returned 404, suggesting the orders listing endpoint may require authentication and the login chain (TC002) had already failed.
- **Fix Needed:** This is a cascading failure — fix Auth (TC001/TC002) and Order routes first.

---

## 3️⃣ Coverage & Matching Metrics

- **10%** of tests passed (1 of 10)

| Requirement Group | Total Tests | ✅ Passed | ❌ Failed |
| :--- | :---: | :---: | :---: |
| 1: Authentication | 5 | 1 | 4 |
| 2: Restaurant Management | 1 | 0 | 1 |
| 3: Order Management | 1 | 0 | 1 |
| 4: Payment Processing | 1 | 0 | 1 |
| 5: Driver Management | 1 | 0 | 1 |
| 6: Live Tracking | 1 | 0 | 1 |
| **Total** | **10** | **1** | **9** |

---

## 4️⃣ Key Gaps / Risks

### 🔴 Critical

1. **Registration Endpoint Validation (TC001):** The `POST /api/v1/auth/register` route rejects valid payloads with 400. This is a **cascading blocker** — every downstream test that requires an authenticated user depends on this working. Priority fix.

2. **Route Path Mismatches (TC003, TC009, TC010):** Several endpoints returned 404 due to path discrepancies between the code summary and the actual registered routes:
   - OTP verify: `/auth/verify-otp` vs actual path
   - Drivers available: `/drivers/available` — may not exist
   - Restaurants menu: `/restaurants/<id>/menu` — may be embedded in detail response

3. **Authentication Cascade:** 4 of 5 auth tests failed. Since most other endpoints require a JWT token, fixing auth is the highest-priority action before re-running any other tests.

### 🟡 Medium

4. **Restaurant Listing Auth (TC006):** The `/api/v1/restaurants` public listing endpoint is protected by JWT. For a food delivery app, browsing restaurants should be public (no login required). Consider making this route unauthenticated.

5. **Payment Intent Schema (TC008):** The mock payment service returns 400 for minimal payloads. The required request body likely differs from what was documented — investigate `routes/payments.py` create-intent handler.

### 🟢 Low

6. **Test Isolation:** Tests share the same SQLite dev database (`wolfie_dev.db`). Duplicate email/phone entries across test runs can cause false-negative 400 errors on registration. A test database reset or unique data seeding strategy is recommended.

7. **Menu Endpoint Documentation:** The `/api/v1/restaurants/<id>/menu` sub-route needs to be confirmed or documented correctly so TestSprite can generate accurate test cases in the next run.
