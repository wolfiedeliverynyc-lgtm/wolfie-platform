# 🐺 Wolfie Delivery — Backend

> Food delivery platform targeting Brooklyn/Williamsburg, NYC.
> Competing against DoorDash and UberEats with lower commissions and a driver-first model.

---

## Business Model

| | Wolfie | DoorDash / UberEats |
|--|--------|---------------------|
| Restaurant commission | 10–18% | 20–30% |
| Driver base pay | $4.00/delivery | ~$2–3 |
| Cash on delivery | ✅ | ❌ |
| Restaurant free trial | 7 days | ❌ |
| Service fee | $1.99–$2.99 | $3–6 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 3.0 + Flask-SocketIO |
| Database | PostgreSQL via Supabase |
| ORM | SQLAlchemy (Repository pattern) |
| Auth | JWT (access 24h + refresh 30d) |
| Payments | Stripe + Cash on delivery |
| Maps | Mapbox (routing + ETA) |
| SMS | Twilio |
| Real-time | WebSocket (Socket.IO) |
| Server | Gunicorn + Gevent |

---

## Project Structure

```
wolfie_backend/
│
├── app.py                      # Flask app factory
├── config.py                   # Environment configs (Base/Dev/Prod/Testing)
├── wsgi.py                     # Production entry point
├── seed_admin.py               # Create first admin user
├── order_state_manager.py      # ⚙️  Centralized order state machine
│
├── database/
│   ├── schemas.py              # SQLAlchemy ORM — all table definitions
│   ├── session.py              # Engine + transaction management
│   └── repositories/
│       ├── base.py             # Generic CRUD (BaseRepository)
│       ├── user.py             # UserRepository
│       ├── order.py            # OrderRepository + state machine integration
│       ├── payment.py          # PaymentRepository + Driver/Restaurant Payouts
│       └── rating.py           # RatingRepository + DriverLocationRepository
│
├── services/
│   ├── payment.py              # Stripe integration
│   ├── pricing.py              # Pricing Engine v5.7
│   ├── matching.py             # Smart driver matching
│   ├── realtime.py             # WebSocket / real-time tracking
│   ├── push.py                 # Twilio SMS notifications
│   ├── mapbox.py               # Routing + ETA calculation
│   └── error_handler.py        # Global error handlers
│
└── routes/
    ├── auth.py                 # Register · Login · Refresh · Profile
    ├── orders.py               # Customer order flow
    ├── drivers.py              # Driver availability · location · earnings
    ├── restaurants.py          # Restaurant dashboard · menu management
    ├── admin.py                # Platform administration
    ├── payments.py             # Stripe intents · webhooks · refunds
    ├── ratings.py              # Reviews · auto-suspension system
    ├── tracking.py             # Live GPS tracking
    ├── subscription.py         # Driver subscription plans
    └── analytics.py            # Admin analytics dashboard
```


## Redis Architecture

Redis يشتغل على **6 databases** — كل واحد بدور محدد:

| DB | الاستخدام | TTL |
|----|-----------|-----|
| 0 | SocketIO message queue — multi-worker scaling | — |
| 1 | Application cache (pricing, menus, routes) | 5 min |
| 2 | Rate limiting (login, register, API) | sliding |
| 3 | Session store — token revocation | 24h |
| 4 | Driver GPS locations (real-time) | 30s |
| 5 | Task queues (SMS, payouts, emails) | — |

### Why Redis is critical for Wolfie

Without Redis, WebSocket events are isolated per worker:
```
Worker 1 ── Customer A
Worker 2 ── Driver B  ← sends location → Customer A never receives it
```

With Redis pub/sub:
```
Worker 1 ── Customer A ←──┐
Worker 2 ── Driver B  ────┼── Redis → all workers see all events
Worker 3 ── Restaurant ←──┘
```

### Rate Limiting

```python
@auth_bp.route("/login")
@rate_limit(limit=10, window=60)   # 10 attempts/min per IP
def login(): ...
```

### Location Cache Flow

```
Driver GPS update
  ↓
Redis DB4 (instant, TTL 30s)   ← tracking reads from here
  ↓
PostgreSQL (persist every update)
```

---

## Order State Machine

All transitions are controlled by `order_state_manager.py` — random status changes are blocked.

```
PENDING → ASSIGNED → ACCEPTED → PREPARING → READY → PICKED_UP → ON_THE_WAY → DELIVERED
   │          │           │           │                                              ▲
   └──────────┴───────────┴───────────┴── CANCELLED ◄─────────────────────────────-┘
```

| Transition | Allowed Roles |
|-----------|---------------|
| PENDING → ASSIGNED | system, admin |
| PENDING → ACCEPTED | restaurant, admin |
| ACCEPTED → PREPARING | restaurant, admin |
| PREPARING → READY | restaurant, admin |
| READY → PICKED_UP | driver, admin |
| PICKED_UP → ON_THE_WAY | driver, admin |
| ON_THE_WAY → DELIVERED | driver, admin |
| any → CANCELLED | depends on stage |

---

## Roles & Permissions

| Role | Access |
|------|--------|
| `customer` | Create orders · view own orders · submit ratings |
| `driver` | Update availability · location · earnings · pick up orders |
| `restaurant` | Accept orders · manage menu · view own orders |
| `admin` | Full access — all routes |

---

## Pricing Engine (v5.7)

```
Driver payout   = $4.00 base + $0.80/km + $0.12/min
Service fee     = $1.99 / $2.49 / $2.99 (by order tier)
Restaurant comm = 10% – 18% (tiered, admin-configurable)
Surge           = demand/supply ratio × weather multiplier
Profit floor    = enforced per order (never below minimum)
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-org/wolfie-backend.git
cd wolfie_backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_KEY, STRIPE_SECRET_KEY,
#          MAPBOX_TOKEN, TWILIO_*, JWT_SECRET_KEY
```

### 3. Create first admin

```bash
python seed_admin.py
# or with custom credentials:
ADMIN_EMAIL=iheb@wolfie.com ADMIN_PASSWORD=MyPass123! python seed_admin.py
```

### 4. Run

```bash
# Development
flask run

# Production
gunicorn wsgi:app -w 4 -k gevent --worker-connections 1000
```

### 5. Docker

```bash
docker-compose up --build
```

---

## API Overview

### Auth
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/api/v1/auth/register` | public |
| POST | `/api/v1/auth/login` | public |
| POST | `/api/v1/auth/refresh` | public |
| GET | `/api/v1/auth/me` | all |

### Orders
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/api/v1/orders/quote` | public |
| POST | `/api/v1/orders/` | customer |
| GET | `/api/v1/orders/<id>` | all |
| PATCH | `/api/v1/orders/<id>/status` | driver · restaurant · admin |
| GET | `/api/v1/orders/customer/<id>` | customer · admin |

### Admin
| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/v1/admin/dashboard` | admin |
| GET | `/api/v1/admin/users` | admin |
| PATCH | `/api/v1/admin/users/<id>/activate` | admin |
| PATCH | `/api/v1/admin/restaurants/<id>/commission` | admin |
| PATCH | `/api/v1/admin/drivers/<id>/approve` | admin |
| PATCH | `/api/v1/admin/orders/<id>/force-status` | admin |


## Queue System (Celery + Redis)

```
Flask route
    │ .delay()
    ▼
Redis DB5 (broker)
    │
    ▼
Celery Worker ── tasks/
                ├─ notify.py    (queue: notifications)
                ├─ matching.py  (queue: matching)
                ├─ payouts.py   (queue: payouts)
                └─ analytics.py (queue: analytics)
```

### Queues & Concurrency

| Queue | Tasks | Concurrency |
|-------|-------|-------------|
| `notifications` | SMS · push · alerts | 4 |
| `matching` | Driver assignment · reassignment | 2 |
| `payouts` | Payout creation · Stripe transfers | 1 (FIFO) |
| `analytics` | Snapshots · event tracking · reports | 2 |

### Beat Scheduler (Periodic Tasks)

| Task | Schedule |
|------|----------|
| Cancel stale orders (>30 min, no driver) | Every 10 min |
| Expire driver trials | Daily midnight |
| Process pending payouts | Every hour |
| Analytics snapshot | Every 15 min |
| Weekly driver earnings report | Monday 6am |

### Start Workers

```bash
# All queues
celery -A celery_app worker --loglevel=info

# Beat scheduler (periodic tasks)
celery -A celery_app beat --loglevel=info

# Monitor dashboard
celery -A celery_app flower --port=5555

# Docker (in docker-compose.yml)
docker-compose up worker beat flower
```

### Retry Policy

All tasks use exponential backoff:
- Attempt 1 → immediate
- Attempt 2 → 30s
- Attempt 3 → 60s
- Attempt 4 → 120s
- Attempt 5 → 240s → **permanent failure logged**

### State Machine → Tasks (automatic via hooks.py)

```
ASSIGNED  → notify_driver + notify_restaurant
READY     → notify_driver (come pick up)
PICKED_UP → order_picked_up SMS to customer
DELIVERED → order_delivered SMS + create_order_payouts + track event
CANCELLED → order_cancelled SMS + track event
```

---

## Running Tests

```bash
pip install pytest PyJWT
pytest test_order_lifecycle.py -v
pytest test_jwt_auth.py -v
```

---

## Key Design Decisions

**Repository Pattern** — routes never touch the DB directly. All queries go through typed repositories with transaction management.

**Centralized State Machine** — `order_state_manager.py` is the single source of truth for all order transitions. No route can bypass it.

**Layered Architecture:**
```
routes/ → repositories/ → schemas/ (SQLAlchemy ORM)
             ↑
         services/ (external APIs)
             ↑
     order_state_manager.py
```

**Transaction Safety** — payment + order status + payout creation always happen in a single atomic transaction. No orphaned records.

---

## Environment Variables

```env
# App
SECRET_KEY=
JWT_SECRET_KEY=

# Database (Supabase)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
DATABASE_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Maps
MAPBOX_TOKEN=pk.eyJ1...

# SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+1...

# Business Rules
BASE_DELIVERY_FEE=4.00
DELIVERY_FEE_PER_KM=0.80
DELIVERY_FEE_PER_MIN=0.12
```

---

*Built remotely from Algeria. Targeting Brooklyn. 🐺*
