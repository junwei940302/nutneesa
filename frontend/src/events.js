document.addEventListener('DOMContentLoaded', async () => {
    // 取得 URL 參數
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) {
        window.location.href = 'services.html';
        return;
    }

    // 取得活動資料
    const res = await fetch(`${API_URL}/api/events`);
    const events = await res.json();
    const event = events.find(e => e._id === eventId);
    if (!event) {
        window.location.href = 'services.html';
        return;
    }

    // 狀態對應 class
    function getStatusClass(status) {
        switch(status) {
            case '開放報名': return 'open';
            case '尚未開始': return 'notyet';
            case '即將開始': return 'soon';
            case '活動結束': return 'ended';
            default: return '';
        }
    }

    // 填入表格
    const tds = document.querySelectorAll('table tbody td:nth-child(2)');
    if (!tds.length) return;
    // 活動名稱
    tds[0].textContent = event.title || 'N/A';
    // 活動類型 hashtag 樣式
    tds[1].innerHTML = event.hashtag ? `<span class="hashtag event">${event.hashtag}</span>` : 'N/A';
    // 活動狀態 hashtag 樣式（動態 class）
    const statusClass = getStatusClass(event.status);
    tds[2].innerHTML = event.status ? `<span class="hashtag status ${statusClass}">${event.status}</span>` : 'N/A';
    // 參與人數 hashtag 樣式
    tds[3].innerHTML = `<span class="hashtag event">${event.enrollQuantity || 0}</span>`;
    // 人數上限 hashtag 樣式
    tds[4].innerHTML = (event.restrictQuantity === 0)
        ? '<span class="hashtag event">無上限</span>'
        : `<span class="hashtag event">${event.restrictQuantity || 'N/A'}</span>`;
    // 系別限制 hashtag 樣式，支援多個
    if (!event.restrictDepartment || event.restrictDepartment.trim() === "") {
        tds[5].innerHTML = '<span class="hashtag event">無限制</span>';
    } else {
        tds[5].innerHTML = event.restrictDepartment.split(/\s+/).map(dep => `<span class="hashtag event">${dep}</span>`).join(' ');
    }
    // 年級限制 hashtag 樣式，支援多個
    if (!event.restrictYear || event.restrictYear.trim() === "") {
        tds[6].innerHTML = '<span class="hashtag event">無限制</span>';
    } else {
        tds[6].innerHTML = event.restrictYear.split(/\s+/).map(year => `<span class="hashtag event">${year}</span>`).join(' ');
    }
    // 非會員費用
    tds[7].textContent = event.nonMemberPrice || '免費參與';
    // 會員費用
    tds[8].textContent = event.memberPrice || '免費參與';
    // 活動日期
    tds[9].textContent = event.eventDate ? (new Date(event.eventDate)).toLocaleString() : 'N/A';
    // 活動地點
    tds[10].textContent = event.location || '未決議或無地點';
    // 報名開始
    tds[11].textContent = event.startEnrollDate ? (new Date(event.startEnrollDate)).toLocaleString() : 'N/A';
    // 報名截止
    tds[12].textContent = event.endEnrollDate ? (new Date(event.endEnrollDate)).toLocaleString() : 'N/A';

    // 美化表格：加上 class
    const rows = document.querySelectorAll('table tbody tr');
    // 1:活動類型, 2:活動狀態, 3:參與人數, 4:人數上限, 5:系別限制, 6:年級限制
    [1,2,3,4,5,6].forEach(idx => {
        if (rows[idx]) rows[idx].classList.add('hashtag-row');
    });

    // 取得活動狀態
    let eventStatus = null;
    if (eventId) {
        const res = await fetch(`${API_URL}/api/events`);
        const events = await res.json();
        const event = events.find(e => e._id === eventId);
        if (event) eventStatus = event.status;
    }
    await handleEnrollBtnAuth(eventStatus);
});

// 報名區塊登入判斷邏輯
async function handleEnrollBtnAuth(eventStatus) {
    const loggedInDiv = document.querySelector('.enrollBtn .loggedIn');
    const notLoggedInDiv = document.querySelector('.enrollBtn .notLoggedIn');
    const noEnrollDiv = document.querySelector('.enrollBtn .noEnroll');
    // 若活動狀態不是開放報名，顯示 noEnroll
    if (eventStatus !== '開放報名') {
        if (loggedInDiv) loggedInDiv.hidden = true;
        if (notLoggedInDiv) notLoggedInDiv.hidden = true;
        if (noEnrollDiv) {
            noEnrollDiv.hidden = false;
            const backBtn = noEnrollDiv.querySelector('.toLastPage');
            if (backBtn) {
                backBtn.onclick = function() {
                    window.history.length > 1 ? window.history.back() : window.location.href = 'events.html';
                };
            }
        }
        return;
    }
    if (!loggedInDiv || !notLoggedInDiv) return;
    let user = null;
    try {
        const res = await fetch((window.API_URL || '') + '/api/me', { credentials: 'include' });
        const data = await res.json();
        if (data.loggedIn && data.user) {
            user = data.user;
        }
    } catch (e) {}
    if (user) {
        loggedInDiv.hidden = false;
        notLoggedInDiv.hidden = true;
        loggedInDiv.querySelector('.userName').textContent = user.name;
        loggedInDiv.querySelector('.userEmail').textContent = user.email;
    } else {
        loggedInDiv.hidden = true;
        notLoggedInDiv.hidden = false;
    }
    // 點擊前往登入
    const loginBtn = document.querySelector('.toLoginBtn');
    if (loginBtn) {
        loginBtn.onclick = function() {
            window.location.href = 'login.html';
        };
    }
    // 點擊下一步：填寫表單
    const enrollBtn = document.querySelector('.enrollSubmit');
    if (enrollBtn) {
        enrollBtn.onclick = function() {
            const params = new URLSearchParams(window.location.search);
            const eventId = params.get('id');
            if (eventId) {
                window.location.href = `form.html?eventId=${eventId}`;
            } else {
                window.location.href = 'form.html';
            }
        };
    }
}
