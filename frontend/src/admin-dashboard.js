import { db } from './firebaseApp.js';
import { collection, query, orderBy, onSnapshot, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let unsubscribePhonograph = null;

function initDashboardPanel() {
    const messagesContainer = document.querySelector('.panel[data-dashboard] #phonograph-messages-container');
    if (!messagesContainer) {
        console.error("Phonograph messages container not found in dashboard.");
        return;
    }

    // Detach any existing listener before attaching a new one to prevent duplicates.
    if (unsubscribePhonograph) {
        unsubscribePhonograph();
    }

    const q = query(collection(db, "phonograph_messages"), orderBy("createdAt", "desc"), limit(50));

    messagesContainer.innerHTML = '<p>正在載入留聲...</p>';

    unsubscribePhonograph = onSnapshot(q, (querySnapshot) => {
        messagesContainer.innerHTML = ''; // Clear previous messages
        if (querySnapshot.empty) {
            messagesContainer.innerHTML = '<p>目前沒有任何留聲。</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const message = doc.data();
            const messageDiv = document.createElement('div');
            messageDiv.className = 'phonograph-message-item';

            const sender = message.isAnonymous ? '匿名' : message.userName || '未知用戶';
            const timestamp = message.createdAt ? message.createdAt.toDate().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : 'N/A';

            // Basic sanitation to prevent HTML injection
            const sanitizedMessage = message.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            messageDiv.innerHTML = `
                <p class="message-content">${sanitizedMessage}</p>
                <small class="message-meta">來自: ${sender} - ${timestamp}</small>
            `;
            messagesContainer.appendChild(messageDiv);
        });
    }, (error) => {
        console.error("Error listening to phonograph messages:", error);
        messagesContainer.innerHTML = '<p>無法載入留聲訊息。</p>';
    });
}

function detachDashboardListeners() {
    if (unsubscribePhonograph) {
        unsubscribePhonograph();
        unsubscribePhonograph = null;
    }
}

// Expose functions to be called by the main admin script
window.initDashboardPanel = initDashboardPanel;
window.detachDashboardListeners = detachDashboardListeners;
