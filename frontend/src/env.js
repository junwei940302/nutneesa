// This file contains environment-specific variables and API keys.
// During local development, this file will be used directly.
// For production, a CI/CD pipeline should generate this file with production values.
// IMPORTANT: DO NOT COMMIT THIS FILE if it contains real secrets.
// A .gitignore entry for `frontend/src/env.js` is recommended.

// --- API Configuration ---

// Use this for the local Firebase emulators
const API_URL = "http://127.0.0.1:5001/nutneesa-b8ea5/us-central1";

// Use this for the deployed production environment
// const API_URL = "";


// --- Firebase Configuration ---
// Replace with your project's Firebase credentials.
const firebaseConfig = {
  apiKey: "AIzaSyDzHVViQRq4F9oXBSU1i_5oEmoOqpe58MA", // Placeholder, replace with your key
  authDomain: "nutneesa-b8ea5.firebaseapp.com",
  projectId: "nutneesa-b8ea5",
  storageBucket: "nutneesa-b8ea5.firebasestorage.app",
  messagingSenderId: "375506095597",
  appId: "1:375506095597:web:78278d3f10b65ff8a52be4",
  measurementId: "G-HR7RQ51WVE"
};

// --- Google Services Configuration ---

// Replace with your Google Maps API key
const googleMapsApiKey = "AIzaSyDeOzMvp4EWuR7G1_niSjLOZRnOJrN59zY"; // Placeholder, replace with your key

// Replace with your reCAPTCHA v2 Site Key
const recaptchaSiteKey = "6LdrKYorAAAAADafKsfVXcPlK5kGaVhfrbAVexKA"; // Placeholder, replace with your key


// --- Firebase Initialization ---
// This initializes the Firebase app. It should be loaded by all pages.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}