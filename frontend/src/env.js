const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost
  ? 'http://localhost:5001/nutneesa-b8ea5/us-central1/api'
  : 'https://api-s7tkezb6xa-uc.a.run.app'; // 你的 Cloud Run API 網址