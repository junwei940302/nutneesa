const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost
  ? 'http://localhost:5001/nutneesa-b8ea5/us-central1/api'
  : '/api'; // 直接用相對路徑，Hosting 會自動轉發