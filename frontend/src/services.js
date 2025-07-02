const serviceSelector = document.querySelector('.serviceSelector');
const infoCards = {
    '新生專區': document.querySelector('.infoCard[data-freshman]'),
    '會員相關服務': document.querySelector('.infoCard[data-memberServices]'),
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

// 新增：自動檢查登入，若已登入則自動切換到會員相關服務
(async function autoSelectMemberServiceIfLoggedIn() {
    if (await checkLogin()) {
        serviceSelector.value = '會員相關服務';
        // 觸發 change 事件以載入會員資料與顯示卡片
        const event = new Event('change', { bubbles: true });
        serviceSelector.dispatchEvent(event);

        const matlabKey = document.querySelector('.matlabKey');
        matlabKey.innerHTML = '13550-01396-46365-69095-09126';
        matlabKey.classList.remove('unauthorize');
        matlabKey.classList.add('authorized');
    }
})();

async function checkLogin() {
    try {
        const res = await fetch(`${API_URL}/api/me`, { credentials: 'include' ,});
        const data = await res.json();
        return data.loggedIn;
    } catch {
        return false;
    }
}

// 動態載入活動報名卡片
async function fetchAndRenderEvents() {
    try {
        const res = await fetch(`${API_URL}/api/events`);
        const events = await res.json();
        // 取得會員狀態
        let memberStatus = null;
        try {
            const meRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
            const meData = await meRes.json();
            if (meData.loggedIn && meData.user) {
                memberStatus = meData.user.status;
            }
        } catch {}
        const activityPanels = document.querySelector('.activityPanels');
        if (!activityPanels) return;
        activityPanels.innerHTML = '';
        events.filter(e => e.visibility).forEach(event => {
            // 限制條件
            let hashtags = `<p class="hashtag event">${event.hashtag || ''}</p>`;
            if (event.restrictDepartment) hashtags += `<p class="hashtag event">系別限制</p>`;
            if (event.restrictYear) hashtags += `<p class="hashtag event">年級限制</p>`;
            if (event.restrictMember) hashtags += `<p class="hashtag event">會員專屬</p>`;
            if (event.restrictQuantity === 0) {
                hashtags += `<p class="hashtag event">人數無上限</p>`;
            } else if (event.restrictQuantity > 0) {
                hashtags += `<p class="hashtag event">${event.enrollQuantity || 0}/${event.restrictQuantity}</p>`;
            }
            // 價格顯示邏輯
            let priceText = '';
            const nonMemberPrice = Number(event.nonMemberPrice) || 0;
            const memberPrice = Number(event.memberPrice) || 0;
            if (memberStatus === '生效中') {
                if (memberPrice === 0) {
                    priceText = '免費參與';
                } else if (memberPrice === nonMemberPrice) {
                    priceText = `新台幣 ${memberPrice} 元整`;
                } else {
                    priceText = `新台幣 ${memberPrice} 元整（已套用會員優惠）`;
                }
            } else {
                if (nonMemberPrice === 0) {
                    priceText = '免費參與';
                } else {
                    priceText = `新台幣 ${nonMemberPrice} 元整`;
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
                            <button class="readMore" title="了解詳情">了解詳情</button>
                            <button class="enrollBtn" title="報名">報名</button>
                        </div>
                    </div>
                </div>
            `;
            activityPanels.appendChild(card);
        });
    } catch (err) {
        console.error('活動載入失敗', err);
    }
}

// 監聽選擇變更
serviceSelector.addEventListener('change', async function() {
    if (this.value === '會員相關服務') {
        if(!(await checkLogin())){
            alert('本服務需先登入');
            window.location.href = 'login.html';
            return;
        }else if((await checkLogin())){
            // 取得會員資料
            const res = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
            const data = await res.json();
            if (data.loggedIn && data.user) {
                const user = data.user;
                // 依序填入 table
                const infoTable = document.querySelector('.personalInfo table');
                if (infoTable) {
                    const tds = infoTable.querySelectorAll('td:nth-child(2)');
                    tds[0].textContent = user.memberId || 'N/A';
                    tds[1].textContent = user.name || 'N/A';
                    tds[2].textContent = user.studentId || 'N/A';
                    tds[3].textContent = user.gender || 'N/A';
                    tds[4].textContent = user.departmentYear || 'N/A';
                    tds[5].textContent = user.email || 'N/A';
                    tds[6].textContent = user.phone || 'N/A';
                    tds[7].textContent = user.status || 'N/A';
                    tds[8].textContent = user.verification ? '已驗證' : '未驗證';
                }
                const qrImg = document.querySelector('.personalInfo img');
                if (qrImg && user.memberId) {
                    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(user.memberId)}`;
                }
                const verifyBtn = document.querySelector('.verifyEmail');
                if(user.verification === false){
                    verifyBtn.style.display = '';
                }
            }
        }
    } else if (this.value === '活動報名') {
        await fetchAndRenderEvents();
    }
    showInfoCard(this.value);
});

// 若一開始就在活動報名頁也自動載入
if (serviceSelector.value === '活動報名') {
    fetchAndRenderEvents();
}

// 登出功能
const logoutBtn = document.querySelector('.logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await fetch(`${API_URL}/api/logout`, { method: 'POST', credentials: 'include' });
        window.location.reload();
    });
}