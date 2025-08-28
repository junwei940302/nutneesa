import { db, auth } from './firebaseApp.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Dynamic Homepage Content ---
async function loadHomepageContent() {
    const docRef = doc(db, "sa_index", "main");

    // Default values
    let settings = {
        title: "Back To School !",
        subtitle: "2025/09/08（一）09:00｜各自課表教室",
        countdownTarget: new Date("2025-09-08T09:00:00+08:00"),
        backgroundUrl: "./assets/images/cubeRotation.gif"
    };

    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            settings.title = data.title || settings.title;
            settings.subtitle = data.subtitle || settings.subtitle;
            settings.backgroundUrl = data.backgroundUrl || settings.backgroundUrl;
            if (data.countdownTarget && data.countdownTarget.toDate) {
                settings.countdownTarget = data.countdownTarget.toDate();
            }
        }
    } catch (error) {
        console.error("Error fetching homepage settings, using defaults.", error);
    }

    const titleElement = document.querySelector('.cardTitle h2');
    const subtitleElement = document.querySelector('.cardTitle p');
    const backgroundElement = document.querySelector('.bg-video');

    if (titleElement) titleElement.textContent = settings.title;
    if (subtitleElement) subtitleElement.textContent = settings.subtitle;
    if (backgroundElement) backgroundElement.src = settings.backgroundUrl;

    setupCountdown(settings.countdownTarget);
}

// --- Countdown Timer ---
function setupCountdown(targetDate) {
    const countdownElement = document.querySelector('.countdown h1');
    if (!countdownElement) return;

    const targetTimestamp = targetDate.getTime();

    function updateCountdown() {
        const now = Date.now();
        let diff = Math.max(0, Math.floor((targetTimestamp - now) / 1000));

        const days = Math.floor(diff / (24 * 3600));
        diff %= 24 * 3600;
        const hours = Math.floor(diff / 3600);
        diff %= 3600;
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;

        const formatted = `${String(days).padStart(2, '0')}天${String(hours).padStart(2, '0')}時${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`;
        countdownElement.textContent = formatted;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// --- News Section ---
async function fetchNews() {
    const infoCard = document.querySelector('.infoCard');
    if (!infoCard) return;

    try {
        let memberStatus = null;
        if (auth.currentUser) {
            const idToken = await getIdToken(auth.currentUser);
            const meRes = await fetch(`${API_URL}/api/me`, {
                headers: { Authorization: 'Bearer ' + idToken }
            });
            const meData = await meRes.json();
            if (meData.loggedIn && meData.user) {
                memberStatus = meData.user.isActive;
            }
        }

        const res = await fetch(`${API_URL}/api/news`);
        let newsList = await res.json();

        if (memberStatus !== '生效中') {
            newsList = newsList.filter(news => news.type !== '會員專屬');
        }

        infoCard.innerHTML = newsList.map(news => `
            <div class="news-item">
                <h3 class="${getTypeClass(news.type)}">${getTypeIcon(news.type)} ${news.type}</h3>
                <p>${news.content}</p>
                <div>${new Date(news.publishDate).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (err) {
        infoCard.innerHTML = '<p>無法載入最新消息。</p>';
        console.error("Failed to load news:", err);
    }
}

function getTypeClass(type) {
    switch(type) {
        case '重要通知': return 'important';
        case '系會資訊': return 'information';
        case '活動快訊': return 'activity';
        case '會員專屬': return 'member';
        default: return type;
    }
}

function getTypeIcon(type) {
    switch(type) {
        case '重要通知': return '<i class="fa-solid fa-circle-exclamation"></i>';
        case '系會資訊': return '<i class="fa-solid fa-circle-info"></i>';
        case '活動快訊': return '<i class="fa-solid fa-gamepad"></i>';
        case '會員專屬': return '<i class="fa-solid fa-web-awesome"></i>';
        default: return type;
    }
}

// --- Initial Load & Animations ---
document.addEventListener('DOMContentLoaded', () => {
    loadHomepageContent();
    fetchNews();

    const mainTitles = document.querySelectorAll('.mainTitle');
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.3 });
    mainTitles.forEach(el => observer.observe(el));
});
