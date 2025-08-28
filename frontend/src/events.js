import { auth } from './firebaseApp.js';
import { getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Helper to format dates in UTC+8 (Taipei)
function formatDateInTaipei(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) {
        window.location.href = 'services.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/events`);
        const events = await res.json();
        const event = events.find(e => e._id === eventId);
        if (!event) {
            window.location.href = 'services.html';
            return;
        }

        populateEventDetails(event);
        handleEnrollBtnAuth(event.status, eventId);
    } catch (error) {
        console.error("Failed to load event details:", error);
        document.querySelector('.content').innerHTML = "<p>無法載入活動詳情。</p>";
    }
});

function getStatusClass(status) {
    switch(status) {
        case '開放報名': return 'open';
        case '尚未開始': return 'notyet';
        case '即將開始': return 'soon';
        case '活動結束': return 'ended';
        default: return '';
    }
}

function populateEventDetails(event) {
    const tds = document.querySelectorAll('table tbody td:nth-child(2)');
    if (!tds.length) return;

    tds[0].textContent = event.title || 'N/A';
    tds[1].innerHTML = event.hashtag ? `<span class="hashtag event">${event.hashtag}</span>` : 'N/A';
    const statusClass = getStatusClass(event.status);
    tds[2].innerHTML = event.status ? `<span class="hashtag status ${statusClass}">${event.status}</span>` : 'N/A';
    tds[3].innerHTML = `<span class="hashtag event">${event.enrollQuantity || 0}</span>`;
    tds[4].innerHTML = (event.restrictQuantity === 0) ? '<span class="hashtag event">無上限</span>' : `<span class="hashtag event">${event.restrictQuantity || 'N/A'}</span>`;
    tds[5].innerHTML = (!event.restrictDepartment || event.restrictDepartment.trim() === "") ? '<span class="hashtag event">無限制</span>' : event.restrictDepartment.split(/\s+/).map(dep => `<span class="hashtag event">${dep}</span>`).join(' ');
    tds[6].innerHTML = (!event.restrictYear || event.restrictYear.trim() === "") ? '<span class="hashtag event">無限制</span>' : event.restrictYear.split(/\s+/).map(year => `<span class="hashtag event">${year}</span>`).join(' ');
    tds[7].textContent = event.nonMemberPrice || '免費參與';
    tds[8].textContent = event.memberPrice || '免費參與';

    // Use the new timezone-aware formatting function
    tds[9].textContent = formatDateInTaipei(event.eventDate);
    tds[10].textContent = event.location || '未決議或無地點';
    tds[11].textContent = formatDateInTaipei(event.startEnrollDate);
    tds[12].textContent = formatDateInTaipei(event.endEnrollDate);

    const rows = document.querySelectorAll('table tbody tr');
    [1,2,3,4,5,6].forEach(idx => {
        if (rows[idx]) rows[idx].classList.add('hashtag-row');
    });
}

async function handleEnrollBtnAuth(eventStatus, eventId) {
    const loggedInDiv = document.querySelector('.enrollBtn .loggedIn');
    const notLoggedInDiv = document.querySelector('.enrollBtn .notLoggedIn');
    const noEnrollDiv = document.querySelector('.enrollBtn .noEnroll');

    if (eventStatus !== '開放報名') {
        if (loggedInDiv) loggedInDiv.hidden = true;
        if (notLoggedInDiv) notLoggedInDiv.hidden = true;
        if (noEnrollDiv) {
            noEnrollDiv.hidden = false;
            noEnrollDiv.querySelector('.toLastPage')?.addEventListener('click', () => window.history.back());
        }
        return;
    }

    if (!loggedInDiv || !notLoggedInDiv) return;

    const user = auth.currentUser;
    if (user) {
        try {
            const idToken = await getIdToken(user);
            const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${idToken}` } });
            const data = await res.json();
            if (data.loggedIn && data.user) {
                loggedInDiv.hidden = false;
                notLoggedInDiv.hidden = true;
                loggedInDiv.querySelector('.userName').textContent = data.user.displayName;
                loggedInDiv.querySelector('.userEmail').textContent = data.user.email;
            } else {
                 loggedInDiv.hidden = true;
                 notLoggedInDiv.hidden = false;
            }
        } catch (e) {
            loggedInDiv.hidden = true;
            notLoggedInDiv.hidden = false;
        }
    } else {
        loggedInDiv.hidden = true;
        notLoggedInDiv.hidden = false;
    }

    document.querySelector('.toLoginBtn')?.addEventListener('click', () => window.location.href = 'login.html');
    document.querySelector('.enrollSubmit')?.addEventListener('click', () => window.location.href = `form.html?eventId=${eventId}`);
}
