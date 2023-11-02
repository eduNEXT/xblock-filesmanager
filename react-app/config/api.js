import axios from 'axios';
import Cookies from 'js-cookie';

const apiConfig = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiConfig.interceptors.request.use((config) => {
  const token = Cookies.get('csrftoken');
  if (token) {
    config.headers['X-CSRFToken'] = token;
  }
  return config;
});

export default apiConfig;
