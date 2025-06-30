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
    }
    showInfoCard(this.value);
});

// 登出功能
const logoutBtn = document.querySelector('.logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await fetch(`${API_URL}/api/logout`, { method: 'POST', credentials: 'include' });
        window.location.reload();
    });
}