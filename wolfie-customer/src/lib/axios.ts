import axios from 'axios';

const formatApiUrl = (url: string | undefined, defaultUrl: string): string => {
  const target = url || defaultUrl;
  const trimmed = target.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api/v1')) {
    return trimmed + '/api/v1';
  }
  return trimmed;
};

const BASE_URL = formatApiUrl(process.env.NEXT_PUBLIC_API_URL, 'https://wolfie-backend-pt9u.onrender.com/api/v1');

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token'); // Will be migrated to cookies in later phases
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor to handle token refresh with a retry limit (max 2 attempts)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle timeout error specifically to give a clearer error message
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.warn('[Axios] Request timed out:', originalRequest.url);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Initialize retry count if not set
      if (originalRequest._retryCount === undefined) {
        originalRequest._retryCount = 0;
      }

      // Check retry limit (max 2 attempts)
      if (originalRequest._retryCount >= 2) {
        console.error('[Axios] Max token refresh retry limit reached (2). Stopping loop.');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('auth_session_expired'));
        }
        return Promise.reject(error);
      }

      originalRequest._retryCount += 1;

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data.data || response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', access_token);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
        }

        processQueue(null, access_token);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('auth_session_expired'));
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

