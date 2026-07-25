/* ═══════════════════════════════════════════════
   WOLFIE RESTAURANT API CLIENT
   Wraps all restaurant backend endpoints with JWT auth
═══════════════════════════════════════════════ */

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1'

const authChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('wolfie_auth')
  : null;

export function getToken() {
  if (typeof window !== 'undefined') {
    const name = 'wolfie_auth_token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
  }
  return null;
}

export function setToken(token) {
  if (typeof window !== 'undefined') {
    document.cookie = `wolfie_auth_token=${token}; path=/; max-age=604800; SameSite=Lax; Secure`;
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    document.cookie = 'wolfie_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    localStorage.clear();
    
    if ('caches' in window) {
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      }).catch(() => {});
    }

    if (authChannel) {
      authChannel.postMessage({ type: 'LOGOUT' });
    }
  }
}

// Multi-tab logout listener
if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data?.type === 'LOGOUT') {
      if (typeof window !== 'undefined' && window.location.hash !== '#/login' && window.location.hash !== '#/register') {
        window.location.hash = '#/login';
      }
    }
  };
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const res = await fetch(`${BASE}${path}`, { 
      ...options, 
      headers,
      credentials: 'include',
      signal: controller.signal
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 401) {
        clearToken();
        if (typeof window !== 'undefined' && window.location.hash !== '#/login' && window.location.hash !== '#/register') {
          window.location.hash = '#/login';
        }
      }
      throw { status: res.status, message: data.error || 'Request failed', data }
    }
    return data
  } finally {
    clearTimeout(timeoutId);
  }
}


// ── Auth (Restaurant) ─────────────────────────
export const restaurantAuth = {
  login:    (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => request('/auth/me'),
  logout:   ()     => { clearToken(); return Promise.resolve() },
  forgotPassword: (email) => request('/auth/restaurant/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (email, otp) => request('/auth/restaurant/verify-reset-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resetPassword: (email, otp, newPassword) => request('/auth/restaurant/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, new_password: newPassword }) }),
}

// ── Restaurant Management ─────────────────────
export const restaurantApi = {
  getProfile:   ()     => request('/auth/me'),
  updateProfile:(body) => request('/restaurants/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  getDashboard: ()     => request('/restaurants/dashboard'),
  getStats:     (range) => request(`/restaurants/stats?range=${range || 'week'}`),
}

// ── Menu Management ───────────────────────────
export const menuApi = {
  getItems:     ()     => request('/restaurants/menu'),
  addItem:      (body) => request('/restaurants/menu', { method: 'POST', body: JSON.stringify(body) }),
  updateItem:   (id, body) => request(`/restaurants/menu/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteItem:   (id)   => request(`/restaurants/menu/${id}`, { method: 'DELETE' }),
  toggleItem:   (id, isAvailable) => request(`/restaurants/menu/${id}`, { method: 'PATCH', body: JSON.stringify({ is_available: isAvailable }) }),
}

// ── Orders ────────────────────────────────────
export const ordersApi = {
  getActive:    ()     => request('/restaurants/orders'),
  getHistory:   (page) => request(`/restaurants/orders/history?page=${page || 1}`),
  updateStatus: (id, status) => {
    if (status === 'ready' || status === 'ready_for_pickup') {
      return request(`/restaurants/orders/${id}/ready`, { method: 'POST' });
    }
    return request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  acceptOrder:  (id)   => request(`/restaurants/orders/${id}/accept`, { method: 'POST' }),
  rejectOrder:  (id)   => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
}

// ── Onboarding ────────────────────────────────
export const onboardingApi = {
  getStatus:    ()     => request('/restaurants/onboarding/status'),
  register:     (body) => request('/restaurants/register', { method: 'POST', body: JSON.stringify(body) }),
  acceptLegal:  (body) => request('/restaurants/legal/accept', { method: 'POST', body: JSON.stringify(body) }),
  activateWap:  (body) => request('/restaurants/wap/activate', { method: 'POST', body: JSON.stringify(body) }),
  setupPayout:  (body) => request('/restaurants/payout/setup', { method: 'POST', body: JSON.stringify(body) }),
}

// ── Finance & Payouts ─────────────────────────
export const financeApi = {
  getBalance:   ()     => request('/restaurants/balance'),
  getTransactions:(q)  => request(`/restaurants/transactions?${new URLSearchParams(q || {})}`),
  getPayouts:   (q)    => request(`/restaurants/payouts?${new URLSearchParams(q || {})}`),
  requestPayout:(body) => request('/restaurants/payouts/request', { method: 'POST', body: JSON.stringify(body) }),
  updateBank:   (body) => request('/restaurants/bank-account', { method: 'POST', body: JSON.stringify(body) }),
  getAiSub:     ()     => request('/restaurants/ai/subscription'),
  upgradeAi:    (body) => request('/restaurants/ai/upgrade', { method: 'POST', body: JSON.stringify(body) }),
}

/* ════════════════════════════════════════════
   MOCK DATA — used when backend is unavailable
════════════════════════════════════════════ */
export const MOCK_DASHBOARD = {
  restaurant_name: "Abu Ali's Kitchen",
  is_open: true,
  today: { revenue: 1245.00, orders: 45, avg_prep: 14 },
  changes: { revenue: '+12.5%', orders: '+5.2%', avg_prep: '-2.1 min' },
  recent_orders: [
    { id: '#1042', customer: 'Sarah M.', items: '2x Truffle Burger, 1x Fries', total: 42.50, status: 'preparing', created_at: '10 min ago' },
    { id: '#1041', customer: 'John D.', items: '1x Spicy Chicken Sandwich', total: 18.00, status: 'ready', created_at: '25 min ago' },
    { id: '#1040', customer: 'Emma W.', items: '3x Veggie Wrap, 2x Smoothie', total: 55.00, status: 'delivered', created_at: '45 min ago' },
    { id: '#1039', customer: 'Michael R.', items: '1x Classic Burger', total: 15.00, status: 'delivered', created_at: '1 hr ago' },
    { id: '#1038', customer: 'Aisha K.', items: '2x Falafel Wrap', total: 22.50, status: 'delivered', created_at: '1.5 hr ago' },
  ]
}

export const MOCK_STATS = {
  weekly: [
    { day: 'Mon', revenue: 4200, orders: 135 },
    { day: 'Tue', revenue: 3800, orders: 118 },
    { day: 'Wed', revenue: 5100, orders: 162 },
    { day: 'Thu', revenue: 4500, orders: 140 },
    { day: 'Fri', revenue: 6800, orders: 210 },
    { day: 'Sat', revenue: 7200, orders: 235 },
    { day: 'Sun', revenue: 5900, orders: 188 },
  ],
  top_items: [
    { name: 'Truffle Burger', orders: 142, revenue: 2556 },
    { name: 'Falafel Wrap', orders: 98, revenue: 1078 },
    { name: 'Wolf Fries', orders: 85, revenue: 467 },
    { name: 'Spicy Chicken', orders: 76, revenue: 1140 },
  ],
  retention: { wolfie_direct: 68, third_party: 12 },
}
