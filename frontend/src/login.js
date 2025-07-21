// 登入檢查，未登入則導回 login.html
document.addEventListener('DOMContentLoaded', function() {
  firebase.auth().onAuthStateChanged(async function(user) {
    if (user) {
      await user.reload(); // 確保 emailVerified 最新
      if (!user.emailVerified) {
        // 強制登出並提示
        firebase.auth().signOut();
        const message = document.getElementById('loginMessage');
        if (message) {
          message.textContent = '請先完成信箱驗證 / Please verify your email before logging in.';
        } else {
          alert('請先完成信箱驗證 / Please verify your email before logging in.');
        }
        return;
      }
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
  const verifyPanel = document.getElementById('verifyPanel');
  const verifyEmail = document.getElementById('verifyEmail');
  const verifyCode = document.getElementById('verifyCode');
  const verifyMessage = document.getElementById('verifyMessage');

  function showPanel(panel) {
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      verifyPanel.style.display = 'none';
      panel.style.display = '';
  }

  loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      showPanel(loginForm);
  });

  registerTab.addEventListener('click', () => {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      showPanel(registerForm);
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
          if (!user) {
              message.textContent = '登入失敗，找不到用戶 / Login failed, user not found.';
              return;
          }
          await user.reload(); // 確保 emailVerified 最新
          if (!user.emailVerified) {
              message.textContent = '請先完成信箱驗證 / Please verify your email before logging in.';
              // 自動發送驗證碼
              await fetch(`${API_URL}/api/verify/send-code`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
              });
              // 直接替換 registerForm 內容為六格驗證碼表單
              registerTab.classList.add('active');
              loginTab.classList.remove('active');
              loginForm.style.display = 'none';
              registerForm.style.display = '';
              registerForm.innerHTML = `
                <div style="text-align:center;margin-bottom:10px;">請輸入寄到 <b>${email}</b> 的 6 位數驗證碼</div>
                <div class="verify-code-row">
                  <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
                  <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
                  <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
                  <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
                  <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
                  <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
                  <button type="button" id="submitCodeBtn" class="verify-arrow-btn"><i class="fa-solid fa-arrow-right"></i></button>
                </div>
                <div class="form-message" id="verifyMessage"></div>
              `;
              // 禁用 tab
              message.textContent = '';
              loginTab.disabled = true;
              registerTab.disabled = true;
              registerTab.textContent = '驗證 Verify';
              function submitCode() {
                const codeInputs = Array.from(document.querySelectorAll('.verify-code-input'));
                const code = codeInputs.map(inp => inp.value).join('');
                const verifyMessage = document.getElementById('verifyMessage');
                if (code.length !== 6) {
                  verifyMessage.textContent = '請輸入 6 位數驗證碼';
                  return;
                }
                fetch(`${API_URL}/api/verify/confirm`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, code })
                })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    verifyMessage.style.color = '#2e7d32';
                    verifyMessage.textContent = '驗證成功！/ Verification success! 請重新登入。';
                    setTimeout(() => {
                      loginTab.classList.add('active');
                      registerTab.classList.remove('active');
                      loginForm.style.display = '';
                      registerForm.style.display = 'none';
                      loginTab.disabled = false;
                      registerTab.disabled = false;
                      registerTab.textContent = '註冊 Register';
                    }, 1500);
                  } else {
                    verifyMessage.style.color = '#c62828';
                    verifyMessage.textContent = data.error || data.message || '驗證失敗 / Verification failed.';
                  }
                })
                .catch(() => {
                  verifyMessage.style.color = '#c62828';
                  verifyMessage.textContent = '伺服器錯誤 / Server error.';
                });
              }
              setupCodeInputs(submitCode);
              document.getElementById('submitCodeBtn').addEventListener('click', submitCode);
              return;
          }
          // 取得 ID Token，後續可用於呼叫後端
          const idToken = await user.getIdToken();
          // 範例：帶 token 呼叫 /api/me
          const res = await fetch(`${API_URL}/api/me`, {
              headers: { 'Authorization': `Bearer ${idToken}` }
          });
          const data = await res.json();
          message.textContent = '登入成功 / Login success!';
          window.location.href = 'memberPage.html';
      } catch (err) {
          console.error('Login error:', err);
          message.textContent = err.message || '登入失敗 / Login failed.';
      }
  });

  // 驗證碼六格自動跳格功能
  function setupCodeInputs(onSubmit) {
    const codeInputs = Array.from(document.querySelectorAll('.verify-code-input'));
    codeInputs.forEach((input, idx) => {
      input.addEventListener('input', function(e) {
        const val = input.value.replace(/[^0-9]/g, '');
        input.value = val;
        if (val && idx < codeInputs.length - 1) {
          codeInputs[idx + 1].focus();
        }
        // 自動送出（可選）
        if (codeInputs.every(inp => inp.value.length === 1)) {
          onSubmit();
        }
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace') {
          if (!input.value && idx > 0) {
            codeInputs[idx - 1].focus();
          }
        } else if (e.key >= '0' && e.key <= '9') {
          input.value = '';
        }
      });
      input.addEventListener('paste', function(e) {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        if (/^\d{6}$/.test(paste)) {
          for (let i = 0; i < 6; i++) {
            codeInputs[i].value = paste[i];
          }
          codeInputs[5].focus();
          e.preventDefault();
          onSubmit();
        }
      });
    });
  }

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
          if (!user) {
              message.textContent = '註冊失敗，無法建立帳號 / Register failed, user not found.';
              return;
          }
          // 關鍵：強制刷新 token，確保 request.auth 生效
          await user.getIdToken(true);

          // 現在寫入 Firestore
          console.log('寫入 members doc id:', user.uid);
          await firebase.firestore().collection("members").doc(user.uid).set({
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

          // 呼叫後端 API 發送驗證碼
          await fetch(`${API_URL}/api/verify/send-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
          });
          // 直接替換 registerForm 內容為六格驗證碼表單
          registerForm.innerHTML = `
            <div style="text-align:center;margin-bottom:10px;">註冊成功，請輸入寄到 <b>${email}</b> 的 6 位數驗證碼</div>
            <div class="verify-code-row">
              <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
              <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
              <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
              <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
              <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
              <input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">
              <button type="button" id="submitCodeBtn" class="verify-arrow-btn"><i class="fa-solid fa-arrow-right"></i></button>
            </div>
            <div class="form-message" id="verifyMessage"></div>
          `;
          // 禁用 tab
          loginTab.disabled = true;
          registerTab.disabled = true;
          registerTab.textContent = '驗證 Verify';
          // 驗證碼送出 function
          function submitCode() {
            const codeInputs = Array.from(document.querySelectorAll('.verify-code-input'));
            const code = codeInputs.map(inp => inp.value).join('');
            const verifyMessage = document.getElementById('verifyMessage');
            if (code.length !== 6) {
              verifyMessage.textContent = '請輸入 6 位數驗證碼';
              return;
            }
            fetch(`${API_URL}/api/verify/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, code })
            })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                verifyMessage.style.color = '#2e7d32';
                verifyMessage.textContent = '驗證成功！/ Verification success! 請重新登入。';
                setTimeout(() => {
                  // 切回登入
                  loginTab.classList.add('active');
                  registerTab.classList.remove('active');
                  loginForm.style.display = '';
                  registerForm.style.display = 'none';
                  // 恢復 tab
                  loginTab.disabled = false;
                  registerTab.disabled = false;
                  registerTab.textContent = '註冊 Register';
                }, 1500);
              } else {
                verifyMessage.style.color = '#c62828';
                verifyMessage.textContent = data.error || data.message || '驗證失敗 / Verification failed.';
              }
            })
            .catch(() => {
              verifyMessage.style.color = '#c62828';
              verifyMessage.textContent = '伺服器錯誤 / Server error.';
            });
          }
          setupCodeInputs(submitCode);
          document.getElementById('submitCodeBtn').addEventListener('click', submitCode);
      } catch (err) {
          console.error('註冊流程錯誤:', err);
          message.textContent = err.message || '註冊失敗 / Register failed.';
      }
  });

  // 驗證碼 panel提交
  verifyPanel.addEventListener('submit', async function(e) {
      e.preventDefault();
      verifyMessage.textContent = '';
      const email = verifyEmail.value.trim();
      const code = verifyCode.value.trim();
      if (!email || !code) {
          verifyMessage.textContent = '請輸入 Email 與驗證碼 / Please enter email and code.';
          return;
      }
      try {
          const res = await fetch(`${API_URL}/api/verify/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, code })
          });
          const data = await res.json();
          if (data.success) {
              verifyMessage.textContent = '驗證成功！/ Verification success! 請重新登入。';
              setTimeout(() => {
                  showPanel(loginForm);
                  loginTab.classList.add('active');
                  registerTab.classList.remove('active');
              }, 1500);
          } else {
              verifyMessage.textContent = data.error || data.message || '驗證失敗 / Verification failed.';
          }
      } catch (err) {
          verifyMessage.textContent = '伺服器錯誤 / Server error.';
      }
  });
})