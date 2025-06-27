// 切換登入/註冊面板
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = '';
    registerForm.style.display = 'none';
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = '';
    loginForm.style.display = 'none';
});

// 登入表單提交
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const message = document.getElementById('loginMessage');
    // 簡單驗證
    if (!email || !password) {
        message.textContent = '請輸入帳號密碼 / Please enter email and password.';
        return;
    }
    message.textContent = '登入中... / Logging in...';
    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            message.textContent = '登入成功 / Login success!';
            if (data.role === '管理員' || data.role === '系學會人員') {
                localStorage.setItem('isAdminLogin', 'true');
                //window.location.href = 'admin.html';
            } else {
                localStorage.removeItem('isAdminLogin');
                window.location.href = 'services.html';
            }
        } else {
            message.textContent = data.message || '登入失敗 / Login failed.';
        }
    } catch (err) {
        message.textContent = '伺服器錯誤 / Server error.';
    }
});

// 註冊表單提交
registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value.toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const memberName = document.getElementById('name').value;
    const studentId = document.getElementById('studentId').value.toUpperCase();
    const gender = document.getElementById('gender').value;
    const departmentYear = document.getElementById('departmentYear').value;
    const phone = document.getElementById('phone').value;
    const message = document.getElementById('registerMessage');
    if (!email || !password || !confirm) {
        message.textContent = '請填寫所有欄位 / Please fill all fields.';
        return;
    }
    if (password !== confirm) {
        message.textContent = '密碼不一致 / Passwords do not match.';
        return;
    }
    message.textContent = '註冊中... / Registering...';
    try {
        const res = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, memberName, studentId, gender, departmentYear, phone})
        });
        const data = await res.json();
        if (data.success) {
            message.textContent = '註冊成功 / Register success!';
            loginTab.click(); // 可選：註冊成功自動切換到登入
        } else {
            message.textContent = data.message || '註冊失敗 / Register failed.';
        }
    } catch (err) {
        message.textContent = '伺服器錯誤 / Server error.';
    }
});
