const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 動態生成 API URL
if (isLocalhost) {
  window.API_URL = 'http://127.0.0.1:5002';
} else {
  // 在生產環境中，API 通常與前端在同一個域名下，通過 Firebase Hosting 的 rewrites 規則路由
  window.API_URL = ``;
}

// Google Maps API Key from Vite env
window.GOOGLE_MAPS_API_KEY = "AIzaSyDeOzMvp4EWuR7G1_niSjLOZRnOJrN59zY";
window.RECAPTCHA_USER_SECRET = "6LdrKYorAAAAADafKsfVXcPlK5kGaVhfrbAVexKA";