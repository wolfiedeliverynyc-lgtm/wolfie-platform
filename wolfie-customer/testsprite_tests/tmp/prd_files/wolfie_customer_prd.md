# Wolfie Delivery - Customer App PRD

## Project Overview
Wolfie Delivery is a food delivery platform focused on New York City.
This is the Customer-facing application.

## Tech Stack
- Frontend: Next.js 16.2.9, React 19, TypeScript, TailwindCSS 4, Turbopack
- Backend API: Flask (Python) at https://wolfie-backend-pt9u.onrender.com
- Database: Supabase PostgreSQL
- Realtime: Flask-SocketIO + Redis
- Maps: Mapbox GL JS
- Payment: Stripe (Test/Mock mode)
- Notifications: Twilio (Mock)

## User Flows

### Authentication Flow
1. User opens app → Onboarding slides
2. Register: Full name + email + phone + password → OTP verification → Address entry → Home
3. Login: Email + password → Home
4. Auto-login if JWT token stored in localStorage

### Customer Order Flow
1. Browse restaurants on Home screen
2. Select restaurant → View menu
3. Select food item → Customize (size, toppings, addons, drinks, spicy level) → Add to cart
4. View cart → Proceed to checkout
5. Enter delivery address, select payment card → Place order
6. Track order in real-time (restaurant preparing → driver assigned → driver on the way → delivered)
7. Rate driver and restaurant after delivery

## Critical Test Cases (Priority: Critical)

### Authentication
- TC001: Customer Login with valid credentials
- TC002: Customer Registration with OTP verification
- TC003: Auto-login with stored JWT token
- TC004: Logout functionality
- TC005: Forgot password flow

### Restaurant & Menu Browsing
- TC006: Load restaurant list from backend API
- TC007: Filter restaurants by near/rating/best_seller
- TC008: Search restaurants by name/category
- TC009: View restaurant detail page
- TC010: Load restaurant menu items

### Cart & Ordering
- TC011: Add item to cart with customization
- TC012: Update cart item quantity
- TC013: Remove item from cart
- TC014: Proceed to checkout with correct total
- TC015: Place order successfully (POST /orders/)
- TC016: Handle payment errors gracefully

### Order Tracking
- TC017: Real-time order status updates via Socket.IO
- TC018: Real-time driver GPS location on map
- TC019: Order status progression (placed → preparing → on the way → delivered)
- TC020: In-app chat with driver

### Profile & Settings
- TC021: Update delivery address
- TC022: Manage payment cards
- TC023: Update dietary preferences and allergies
- TC024: View order history

## API Endpoints
- POST /auth/login
- POST /auth/register
- POST /auth/otp/send
- POST /auth/otp/verify
- GET /auth/me
- PATCH /auth/me
- GET /restaurants/
- GET /restaurants/menu?restaurant_id={id}
- POST /orders/

## WebSocket Events
- join_order / leave_order
- driver_location (receives driver GPS coords)
- order_status_update (receives order status changes)
- order_chat / chat_message

## Security Requirements
- JWT authentication required for all protected endpoints
- Input validation on all forms
- No sensitive data in localStorage beyond JWT token
- CORS configured correctly

## Performance Requirements
- App loads within 3 seconds
- Restaurant list loads within 2 seconds
- Real-time updates appear within 1 second
- Map renders without visible lag

## Success Criteria
- Customer can register and login
- Customer can browse restaurants and add items to cart
- Customer can place an order successfully
- Customer receives real-time status updates
- Map tracking works correctly
- No critical JavaScript errors
