const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost
  ? 'http://localhost:3001'
  : 'https://nutneesa.onrender.com';