import axios from 'axios';

const api = axios.create({
  baseURL: '', // Using Vite proxy
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization Bearer token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slidms_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;

