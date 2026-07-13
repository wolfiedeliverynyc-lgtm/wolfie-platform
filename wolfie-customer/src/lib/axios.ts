import axios from 'axios';

const formatApiUrl = (url: string | undefined, defaultUrl: string): string => {
  const target = url || defaultUrl;
  const trimmed = target.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api/v1')) {
    return trimmed + '/api/v1';
  }
  return trimmed;
};

export const apiClient = axios.create({
  baseURL: formatApiUrl(process.env.NEXT_PUBLIC_API_URL, 'https://wolfie-backend-pt9u.onrender.com/api/v1'),
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
