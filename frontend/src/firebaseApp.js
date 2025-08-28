import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Note: `firebaseConfig` is sourced from `env.js`, which must be loaded before this script in the HTML.
const app = initializeApp(firebaseConfig);

// Export the initialized services for use in other modules.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
