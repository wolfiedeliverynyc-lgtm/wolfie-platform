// Central API Fetch Utility for connecting to Flask Backend

// Dynamically read the base API url, default to localhost Flask port
const API_BASE_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' ? 'http://localhost:5000/api/v1' : 'http://localhost:5000/api/v1') 
  : 'http://localhost:5000/api/v1';

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('wolfie_auth_token');
  }
  return null;
};

export const setAuthToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('wolfie_auth_token', token);
    } else {
      localStorage.removeItem('wolfie_auth_token');
    }
  }
};

export const getAuthUserId = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('wolfie_auth_user_id');
  }
  return null;
};

export const setAuthUserId = (userId: string | null) => {
  if (typeof window !== 'undefined') {
    if (userId) {
      localStorage.setItem('wolfie_auth_user_id', userId);
    } else {
      localStorage.removeItem('wolfie_auth_user_id');
    }
  }
};

interface FetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export async function apiRequest(endpoint: string, options: FetchOptions = {}) {
  const baseUrl = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}/api/v1`;
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach JWT Authorization token if available
  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchConfig: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchConfig.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchConfig);
    
    // Handle unauthorized responses gracefully by clearing token
    if (response.status === 401) {
      setAuthToken(null);
      setAuthUserId(null);
    }

    const data = await response.json();
    
    if (!response.ok) {
      return {
        error: data.error || response.statusText || 'Request failed',
        status: response.status,
        success: false
      };
    }

    return {
      data,
      status: response.status,
      success: true
    };
  } catch (err) {
    console.warn(`[Wolfie API Connection Error]: Failed to reach backend. Falling back to local offline mode.`, err);
    return {
      error: 'Network connection failed',
      fallback: true,
      success: false
    };
  }
}
