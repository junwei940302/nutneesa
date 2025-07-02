const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost
  ? 'http://localhost:5001/nutneesa-b8ea5/us-central1'
  : '';