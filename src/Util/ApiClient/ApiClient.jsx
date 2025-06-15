import axios from 'axios';

// Detecta el host donde está corriendo el frontend
const frontendHost = window.location.hostname;

// Si el frontend está en localhost, usa localhost para el backend
// Si no, usa la IP de tu PC en la red local
let baseUrl;
if (frontendHost === 'localhost' || frontendHost === '127.0.0.1') {
  baseUrl = 'http://localhost:8080';
} else {
  baseUrl = 'http://192.168.20.22:8080'; // Reemplaza con tu IP local real
}

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const ApiClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

ApiClient.interceptors.request.use(config => {
  const xsrfToken = getCookie('XSRF-TOKEN');
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = xsrfToken;
  }
  return config;
});

export default ApiClient;
