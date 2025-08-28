import { db } from './firebaseApp.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const INDEX_SETTINGS_DOC_REF = doc(db, "sa_index", "main");

const titleInput = document.getElementById('index-title');
const subtitleInput = document.getElementById('index-subtitle');
const countdownInput = document.getElementById('index-countdown');
const bgUrlInput = document.getElementById('index-bg-url');
const saveButton = document.getElementById('save-index-settings');
const statusText = document.getElementById('index-save-status');

// Fetch existing settings and populate the form
async function loadIndexSettings() {
    if (!saveButton) return; // Don't run if the elements aren't on the page

    try {
        statusText.textContent = "載入中...";
        const docSnap = await getDoc(INDEX_SETTINGS_DOC_REF);
        if (docSnap.exists()) {
            const data = docSnap.data();
            titleInput.value = data.title || '';
            subtitleInput.value = data.subtitle || '';
            bgUrlInput.value = data.backgroundUrl || '';
            if (data.countdownTarget && data.countdownTarget.toDate) {
                // Convert Firestore Timestamp to a format suitable for datetime-local input
                const date = data.countdownTarget.toDate();
                // Adjust for local timezone for correct display in the input
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                countdownInput.value = date.toISOString().slice(0, 16);
            }
        } else {
            console.log("No index settings document found. Using defaults.");
        }
        statusText.textContent = "設定已載入。";
    } catch (error) {
        console.error("Error loading index settings:", error);
        statusText.textContent = `載入設定失敗: ${error.message}`;
    }
}

// Save settings to Firestore
async function saveIndexSettings() {
    if (!titleInput || !subtitleInput || !countdownInput || !bgUrlInput) {
        console.error("One or more form elements for index settings not found.");
        return;
    }

    try {
        statusText.textContent = "儲存中...";
        const settings = {
            title: titleInput.value,
            subtitle: subtitleInput.value,
            // Convert local datetime string back to a Date object for Firestore
            countdownTarget: new Date(countdownInput.value),
            backgroundUrl: bgUrlInput.value,
            updatedAt: serverTimestamp()
        };

        await setDoc(INDEX_SETTINGS_DOC_REF, settings);
        statusText.textContent = "設定已成功儲存！";
        setTimeout(() => { statusText.textContent = "" }, 3000);
    } catch (error) {
        console.error("Error saving index settings:", error);
        statusText.textContent = `儲存失敗: ${error.message}`;
    }
}

if (saveButton) {
    saveButton.addEventListener('click', saveIndexSettings);
}

// Expose the function to the global scope so admin.js can call it
// when the "Index" panel is selected.
window.initIndexPanel = loadIndexSettings;
