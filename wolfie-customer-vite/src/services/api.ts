import { Restaurant, MenuItem, CartItem, Address, PaymentMethod, Order } from '../types';

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Get token from localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem('wolfie_customer_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('wolfie_customer_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('wolfie_customer_token');
  localStorage.removeItem('wolfie_customer_user');
}

// Common fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): Promise<T> {
  const token = getAuthToken();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; role: string; user: any }> {
    const res = await apiRequest<any>('/auth/login', 'POST', { email, password });
    const token = res.access_token;
    if (token) {
      setAuthToken(token);
      const user = { id: res.user_id, email, fullName: res.full_name };
      localStorage.setItem('wolfie_customer_user', JSON.stringify(user));
      return { token, role: res.role, user };
    }
    throw new Error('Authentication failed');
  },

  async register(email: string, password: string, fullName: string, phone: string): Promise<{ token: string; role: string; user: any }> {
    const res = await apiRequest<any>('/auth/register', 'POST', {
      email,
      password,
      full_name: fullName,
      phone,
      role: 'customer'
    });
    const token = res.access_token;
    if (token) {
      setAuthToken(token);
      const user = { id: res.user_id, email, fullName, phone };
      localStorage.setItem('wolfie_customer_user', JSON.stringify(user));
      return { token, role: res.role, user };
    }
    throw new Error('Registration failed');
  },

  async getProfile(): Promise<any> {
    return apiRequest<any>('/auth/me', 'GET');
  },

  // Restaurants
  async getRestaurants(): Promise<Restaurant[]> {
    const res = await apiRequest<{ restaurants: any[] }>('/restaurants', 'GET');
    return res.restaurants.map((u: any) => ({
      id: u.id,
      name: u.restaurant_name,
      description: u.bio || 'No description available',
      category: u.category || 'Gourmet',
      rating: u.rating || 5.0,
      ratingCount: u.ratingCount || 0,
      deliveryTimeMin: u.delivery_time_min || 25,
      deliveryFee: u.delivery_fee || 0.0,
      priceLevel: u.price_level || '$$',
      status: u.is_open ? 'open' : 'closed',
      story: u.story || '',
      bio: u.bio || '',
      chefName: u.chef_name || '',
      chefBio: u.chef_bio || '',
      chefImage: u.chef_image || '',
      heroImage: u.hero_image || '',
      logoImage: u.logo_image || '',
      address: u.address || '',
      coordinates: { lat: u.latitude || 40.7128, lng: u.longitude || -74.0060 },
      menu: [] // Fetched separately
    }));
  },

  async getMenu(restaurantId: string): Promise<MenuItem[]> {
    const res = await apiRequest<{ menu: any[] }>(`/restaurants/menu?restaurant_id=${restaurantId}`, 'GET');
    return res.menu.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image: item.image_url || '',
      isPopular: item.is_available
    }));
  },

  // Addresses
  async getAddresses(): Promise<Address[]> {
    const res = await apiRequest<any[]>('/addresses', 'GET');
    return res.map(a => ({
      id: a.id,
      label: a.label,
      street: a.street,
      city: a.city,
      state: 'NY',
      zip: '',
      isDefault: a.is_default
    }));
  },

  async createAddress(street: string, city: string, label: string, apt?: string, notes?: string): Promise<Address> {
    const a = await apiRequest<any>('/addresses', 'POST', { street, city, label, apt, notes });
    return {
      id: a.id,
      label: a.label,
      street: a.street,
      city: a.city,
      state: 'NY',
      zip: '',
      isDefault: a.is_default
    };
  },

  async deleteAddress(id: string): Promise<void> {
    await apiRequest<void>(`/addresses/${id}`, 'DELETE');
  },

  async setDefaultAddress(id: string): Promise<void> {
    await apiRequest<void>(`/addresses/${id}/default`, 'PATCH');
  },

  // Favorites
  async getFavorites(): Promise<string[]> {
    const res = await apiRequest<any[]>('/favorites', 'GET');
    return res.map(f => f.restaurant_id);
  },

  async addFavorite(restaurantId: string): Promise<void> {
    await apiRequest<void>('/favorites', 'POST', { restaurant_id: restaurantId });
  },

  async removeFavorite(restaurantId: string): Promise<void> {
    await apiRequest<void>(`/favorites/${restaurantId}`, 'DELETE');
  },

  // Orders & Quotes
  async getQuote(pickupAddress: string, deliveryAddress: string, items: any[]): Promise<any> {
    return apiRequest<any>('/orders/quote', 'POST', {
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      items: items.map(ci => ({
        id: ci.menuItem.id,
        name: ci.menuItem.name,
        price: ci.menuItem.price,
        quantity: ci.quantity
      }))
    });
  },

  async createOrder(params: {
    customerId: string;
    restaurantId: string;
    items: any[];
    pickupAddress: string;
    deliveryAddress: string;
    paymentMethod: string;
  }): Promise<any> {
    return apiRequest<any>('/orders/', 'POST', {
      customer_id: params.customerId,
      restaurant_id: params.restaurantId,
      items: params.items.map(ci => ({
        id: ci.menuItem.id,
        name: ci.menuItem.name,
        price: ci.menuItem.price,
        quantity: ci.quantity,
        customization: ci.customization
      })),
      pickup_address: params.pickupAddress,
      delivery_address: params.deliveryAddress,
      payment_method: params.paymentMethod
    });
  },

  async getOrder(orderId: string): Promise<any> {
    return apiRequest<any>(`/orders/${orderId}`, 'GET');
  },
  
  // Payment Intent
  async createPaymentIntent(orderId: string, amount: number): Promise<{ client_secret: string }> {
    return apiRequest<{ client_secret: string }>('/payments/create-intent', 'POST', {
      order_id: orderId,
      amount
    });
  }
};
