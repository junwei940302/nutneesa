// 登入檢查，未登入則導回 login.html
firebase.auth().onAuthStateChanged(async function(user) {
  if (user) {
    // 已登入，取得 token
    const idToken = await user.getIdToken();
    fetch(`${API_URL}/api/me`, {headers: { Authorization: 'Bearer ' + idToken }})
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          window.location.href = 'services.html';
        }
      });
  }
  // else: 未登入，不做事，留在登入頁
});

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
    if (!email || !password) {
        message.textContent = '請輸入帳號密碼 / Please enter email and password.';
        return;
    }
    message.textContent = '登入中... / Logging in...';
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await user.reload(); // 這行會同步最新的 emailVerified 狀態
        if (!user.emailVerified) {
            message.textContent = '請先驗證您的信箱 / Please verify your email first.';
            await user.sendEmailVerification();
            return;
        }
        // 取得 ID Token，後續可用於呼叫後端
        const idToken = await userCredential.user.getIdToken();
        // 範例：帶 token 呼叫 /api/me
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await res.json();
        message.textContent = '登入成功 / Login success!';
        window.location.href = 'services.html';
    } catch (err) {
        message.textContent = err.message || '登入失敗 / Login failed.';
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
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await user.sendEmailVerification();
        // 新增 Firestore 會員資料
        const db = firebase.firestore();
        await db.collection("members").doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: memberName,
          phoneNumber: user.phoneNumber || "未填寫",
          disabled: false,
          metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime
          },
          studentId,
          gender,
          departmentYear,
          role: departmentYear && departmentYear.includes("電機") ? "本系會員" : "非本系會員",
          cumulativeConsumption: 0,
          isActive: "待驗證",
        });
        message.textContent = '註冊成功，請至信箱收信並點擊驗證連結 / Register success! Please check your email to verify.';
        loginTab.click();
    } catch (err) {
        message.textContent = err.message || '註冊失敗 / Register failed.';
    }
});
