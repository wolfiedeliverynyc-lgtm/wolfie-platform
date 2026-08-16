// Central API Fetch Utility for connecting to Flask Backend

const formatApiUrl = (url: string | undefined, defaultUrl: string): string => {
  const target = url || defaultUrl;
  const trimmed = target.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api/v1')) {
    return trimmed + '/api/v1';
  }
  return trimmed;
};

// Dynamically read the base API url with smart production fallback
export const API_BASE_URL = formatApiUrl(
  process.env.NEXT_PUBLIC_API_URL,
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://wolfie-backend-pt9u.onrender.com/api/v1'
    : 'http://localhost:5000/api/v1'
);


const getTokenFromCookie = () => {
  if (typeof document === 'undefined') return null;
  const name = 'wolfie_auth_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  return null;
};

export const getAuthToken = (): string | null => {
  return getTokenFromCookie();
};

export const setAuthToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    const isSecure = window.location.protocol === 'https:';
    if (token) {
      document.cookie = `wolfie_auth_token=${token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    } else {
      document.cookie = 'wolfie_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  }
};

export const deleteAuthToken = () => {
  setAuthToken(null);
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
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
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
      let errorMsg = data.error || response.statusText || 'Request failed';
      if (data.details && Array.isArray(data.details) && data.details.length > 0) {
        const detailMsgs = data.details.map((d: any) => d.message).join(', ');
        errorMsg = `${errorMsg}: ${detailMsgs}`;
      }
      return {
        error: errorMsg,
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
