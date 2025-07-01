import axios from 'axios';
import { message } from 'antd';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  timeout: 10000,
});

// Add global response interceptor for auth
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Token invalid or expired
      localStorage.removeItem('xtv_token');
      delete api.defaults.headers.common['Authorization'];
      message.error('Session expired. Please login again.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 