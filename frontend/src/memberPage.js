// 會員頁面自動載入會員資料與報名記錄
function showMemberLoading() {
    document.querySelector('.member-loading-overlay').style.display = 'flex';
}
function hideMemberLoading() {
    document.querySelector('.member-loading-overlay').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', async function() {
    showMemberLoading();
    try {
        // 檢查登入
        const user = await getCurrentUserAsync();
        if (!user) {
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
            // matlabKey 權限顯示（如有）
            const matlabKey = document.querySelector('.matlabKey');
            if (matlabKey) {
                matlabKey.innerHTML = '13550-01396-46365-69095-09126';
                matlabKey.classList.remove('unauthorize');
                matlabKey.classList.add('authorized');
            }
            // 載入用戶報名記錄
            await loadUserEnrollmentHistory();
        }
    } finally {
        hideMemberLoading();
    }
});

// 載入用戶報名記錄
async function loadUserEnrollmentHistory() {
    showMemberLoading();
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
    } finally {
        hideMemberLoading();
    }
}

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



