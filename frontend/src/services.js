const serviceSelector = document.querySelector('.serviceSelector');
const infoCards = {
    '新生專區': document.querySelector('.infoCard[data-freshman]'),
    '活動報名': document.querySelector('.infoCard[data-enroll]'),
    '活動相簿': document.querySelector('.infoCard[data-photo]'),
    '大府城美食地圖': document.querySelector('.infoCard[data-map]'),
    '系會收支紀錄': document.querySelector('.infoCard[data-flowHistory]'),
    '系會會議紀錄': document.querySelector('.infoCard[data-conferenceHistory]')
};

function showInfoCard(selected) {
    Object.keys(infoCards).forEach(key => {
        if (key === selected) {
            infoCards[key].style.display = '';
        } else {
            infoCards[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showInfoCard(serviceSelector.value);

// 取得活動搜尋器控件
const activitySearcher = document.querySelector('.activitySearcher');
let activityStatusSelect, activityTypeSelect, freeOnlyCheckbox;
if (activitySearcher) {
    activityStatusSelect = activitySearcher.querySelector('.activityStatus');
    activityTypeSelect = activitySearcher.querySelector('.activityType');
    freeOnlyCheckbox = activitySearcher.querySelector('input[type="checkbox"]');
}

// 監聽搜尋器變化
if (activitySearcher) {
    [activityStatusSelect, activityTypeSelect, freeOnlyCheckbox].forEach(el => {
        el.addEventListener('change', () => {
            fetchAndRenderEvents();
        });
    });
}

// 動態載入活動報名卡片（加上篩選功能）
async function fetchAndRenderEvents() {
    try {
        const res = await fetch(`${API_URL}/api/events`);
        let events = await res.json();
        // 取得會員狀態
        let memberStatus = null;
        try {
            const user = firebase.auth().currentUser;
            const idToken = await user.getIdToken();
            const res = await fetch(`${API_URL}/api/me`, {
                headers: { Authorization: 'Bearer ' + idToken }
            });
            const data = await res.json();
            if (data.loggedIn && data.user) {
                memberStatus = data.user.status;
            }
        } catch {}
        const activityPanels = document.querySelector('.activityPanels');
        if (!activityPanels) return;
        activityPanels.innerHTML = '';

        // 取得篩選條件
        let statusFilter = activityStatusSelect ? activityStatusSelect.value : '全部';
        let typeFilter = activityTypeSelect ? activityTypeSelect.value : '全部';
        let freeOnly = freeOnlyCheckbox ? freeOnlyCheckbox.checked : false;

        // 篩選活動
        events = events.filter(e => e.visibility);
        if (statusFilter && statusFilter !== '全部') {
            // 假設 event.status 有對應狀態，否則請調整這裡
            events = events.filter(e => e.status === statusFilter);
        }
        if (typeFilter && typeFilter !== '全部') {
            // 假設 event.hashtag 直接等於 #實習 這種格式
            events = events.filter(e => e.hashtag === typeFilter);
        }
        if (freeOnly) {
            // 會員或非會員價格皆為 0 視為免費
            events = events.filter(e => (Number(e.memberPrice) || 0) === 0 && (Number(e.nonMemberPrice) || 0) === 0);
        }

        // 依照活動狀態排序：將'活動結束'的活動排到最後
        events.sort((a, b) => {
            if (a.status === '活動結束' && b.status !== '活動結束') return 1;
            if (a.status !== '活動結束' && b.status === '活動結束') return -1;
            return 0;
        });

        events.forEach(event => {
            // 限制條件
            let hashtags = '';
            hashtags += `<p class="hashtag event">${event.hashtag || ''}</p>`;
            if (event.status) {
                hashtags += `<p class="hashtag status">${event.status}</p>`;
            }
            if (event.restrictQuantity === 0) {
                hashtags += `<p class="hashtag event">人數無上限</p>`;
            } else if (event.restrictQuantity > 0) {
                hashtags += `<p class="hashtag event">${event.enrollQuantity || 0}/${event.restrictQuantity}</p>`;
            }
            if (event.restrictDepartment) hashtags += `<p class="hashtag event">系別限制</p>`;
            if (event.restrictYear) hashtags += `<p class="hashtag event">年級限制</p>`;
            if (event.restrictMember) hashtags += `<p class="hashtag event">會員專屬</p>`;
            // 價格顯示邏輯
            let priceText = '';
            const nonMemberPrice = Number(event.nonMemberPrice) || 0;
            const memberPrice = Number(event.memberPrice) || 0;
            if (memberStatus === '生效中') {
                if (memberPrice === 0) {
                    priceText = '免費參與';
                } else if (memberPrice === nonMemberPrice) {
                    priceText = `新台幣 ${memberPrice} 元`;
                } else {
                    priceText = `新台幣 ${memberPrice} 元（已套用會員優惠）`;
                }
            } else {
                if (nonMemberPrice === 0) {
                    priceText = '免費參與';
                } else {
                    priceText = `新台幣 ${nonMemberPrice} 元`;
                }
            }
            // 卡片
            const card = document.createElement('div');
            card.className = 'activityItem';
            card.innerHTML = `
                <img src="${event.imgUrl}" title="活動插圖">
                <div class="textZone">
                    <h2>${event.title || ''}</h2>
                    <div class="activityHashtag">${hashtags}</div>
                    <div class="activityContent">
                        <p>${event.content || ''}</p>
                        <div class="activityPrice">
                            <h3>${priceText}</h3>
                        </div>
                        <div class="btnZone">
                            <button class="readMore" data-id="${event._id}" title="詳細資料">詳細資料</button>
                            ${event.status === '開放報名' ? '<button class="enrollBtn" title="報名">報名</button>' : ''}
                        </div>
                    </div>
                </div>
            `;
            activityPanels.appendChild(card);
        });

        // 新增：監聽「詳細資料」按鈕，導向 events.html?id=活動id
        // 新增：監聽「報名」按鈕，導向 form.html?id=活動id
        if (activityPanels) {
            activityPanels.addEventListener('click', function(e) {
                if (e.target.classList.contains('readMore')) {
                    const id = e.target.getAttribute('data-id');
                    window.location.href = `events.html?id=${id}`;
                } else if (e.target.classList.contains('enrollBtn')) {
                    const id = e.target.closest('.activityItem').querySelector('.readMore').getAttribute('data-id');
                    window.location.href = `form.html?eventId=${id}`;
                }
            });
        }
    } catch (err) {
        console.error('活動載入失敗', err);
    }
}


// 監聽 serviceSelector 變更時才載入對應資料
serviceSelector.addEventListener('change', async function() {
    if (this.value === '會員相關服務') {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert('本服務需先登入');
            window.location.href = 'login.html';
            return;
        }
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/me`, {
            headers: { Authorization: 'Bearer ' + idToken }
        });
        const data = await res.json();
        if (data.loggedIn && data.user) {
            const user = data.user;
            // 依序填入 table
            const infoTable = document.querySelector('.personalInfo table');
            if (infoTable) {
                const tds = infoTable.querySelectorAll('td:nth-child(2)');
                tds[0].textContent = user.memberId || '載入中';
                tds[1].textContent = user.displayName || '載入中';
                tds[2].textContent = user.studentId || '載入中';
                tds[3].textContent = user.gender || '載入中';
                tds[4].textContent = user.departmentYear || '載入中';
                tds[5].textContent = user.email || '載入中';
                tds[6].textContent = user.phoneNumber || '載入中';
                // 狀態顯示（isActive: string）
                let statusText = '載入中';
                if (user.isActive === '生效中') statusText = '生效中';
                else if (user.isActive === '待驗證') statusText = '待驗證';
                else if (user.isActive === '未生效') statusText = '未生效';
                else if (user.isActive === '已撤銷') statusText = '已撤銷';
                tds[7].textContent = statusText;
                tds[8].textContent = user.emailVerified ? '已驗證' : '未驗證';
            }
            const qrImg = document.querySelector('.personalInfo img');
            if (qrImg && user.memberId) {
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(user.memberId)}`;
            }
            // 檢查是否為管理員或系學會成員，控制 .hrefAdmin 按鈕顯示
            const hrefAdminBtn = document.querySelector('.hrefAdmin');
            if (hrefAdminBtn) {
                if (user.role === '管理員' || user.role === '系學會人員') {
                    hrefAdminBtn.style.display = '';
                } else {
                    hrefAdminBtn.style.display = 'none';
                }
            }
            // 載入用戶報名記錄
            await loadUserEnrollmentHistory();
        }
    } else if (this.value === '活動報名') {
        await fetchAndRenderEvents();
    }
    showInfoCard(this.value);
});

// 載入用戶報名記錄
async function loadUserEnrollmentHistory() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/responses/user`, {
            headers: { Authorization: 'Bearer ' + idToken }
        });
        if (!res.ok) {
            console.error('Failed to fetch enrollment history');
            return;
        }
        const enrollments = await res.json();
        const tableBody = document.querySelector('.enrollmentTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (enrollments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">尚無報名記錄</td></tr>';
            return;
        }
        enrollments.forEach((enrollment, index) => {
            const tr = document.createElement('tr');
            const submittedDate = new Date(enrollment.submittedAt).toLocaleString('zh-TW');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${enrollment.eventTitle}</td>
                <td>已填寫 (${submittedDate})</td>
                <td>${enrollment.amount > 0 ? `NT$ ${enrollment.amount}` : '免費'}</td>
                <td>${enrollment.paymentMethod}</td>
                <td>${enrollment.paymentStatus}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading enrollment history:', err);
    }
}

// 恢復：自動檢查登入，若已登入則自動切換到會員相關服務並載入資料
(async function autoSelectMemberServiceIfLoggedIn() {
    if (serviceSelector.value === '新生專區' && await checkLogin()) {
        // 觸發 change 事件以載入會員資料與顯示卡片
        const event = new Event('change', { bubbles: true });
        serviceSelector.dispatchEvent(event);
        const matlabKey = document.querySelector('.matlabKey');
        if (matlabKey) {
            matlabKey.innerHTML = '13550-01396-46365-69095-09126';
            matlabKey.classList.remove('unauthorize');
            matlabKey.classList.add('authorized');
        }
    }
})();

async function checkLogin() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            return false;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await res.json();
        return data.loggedIn;
    } catch {
        return false;
    }
}

// 頁面初始時只根據預設選項載入一次
(async function initPanel() {
    if (serviceSelector.value === '活動報名') {
        await fetchAndRenderEvents();
    }
})();

// 登出功能
const logoutBtn = document.querySelector('.logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await firebase.auth().signOut();
        window.location.reload();
    });
}

// 進入控制中心功能
const hrefAdminBtn = document.querySelector('.hrefAdmin');
if (hrefAdminBtn) {
    hrefAdminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
}