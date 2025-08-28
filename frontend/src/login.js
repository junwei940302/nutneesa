import { auth, db } from './firebaseApp.js';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    getIdToken
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Student ID and Email Validation Logic ---

const departmentMap = {
    '12': '教育', '13': '體育', '22': '國語文', '27': '英語', '28': '諮商',
    '29': '經管', '32': '行管', '34': '文資', '40': '特教', '50': '應數',
    '55': '數位', '56': '生態', '58': '生科', '59': '資工', '64': '音樂',
    '67': '材料', '70': '幼教', '72': '戲劇', '82': '電機', '83': '綠能', '90': '視設'
};

const yearInChinese = { 1: '一', 2: '二', 3: '三', 4: '四' };

function validateStudentId(studentId) {
    return /^[A-Z]\d{8}$/.test(studentId);
}

function getDepartmentAndYear(studentId) {
    if (!validateStudentId(studentId)) {
        return null;
    }

    const admissionYear = parseInt(studentId.substring(1, 4), 10);
    const deptCode = studentId.substring(4, 6);

    const department = departmentMap[deptCode];
    if (!department) {
        return "未知科系";
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // School year starts in September. If before September, it's the previous school year.
    const currentSchoolYearROC = (currentMonth >= 9) ? currentYear - 1911 : currentYear - 1912;

    const grade = currentSchoolYearROC - admissionYear + 1;

    if (grade > 4) {
        return "已畢/肄業";
    } else if (grade < 1) {
        return "新生";
    } else {
        return `${department}${yearInChinese[grade]}`;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    // --- Event Listeners for Auto-fill ---
    const studentIdInput = document.getElementById('studentId');
    const departmentYearInput = document.getElementById('departmentYear');
    const registerEmailInput = document.getElementById('registerEmail');

    if (studentIdInput && departmentYearInput) {
        studentIdInput.addEventListener('input', () => {
            const studentId = studentIdInput.value.toUpperCase();
            if (validateStudentId(studentId)) {
                departmentYearInput.value = getDepartmentAndYear(studentId);
                studentIdInput.style.borderColor = ''; // Reset border
            } else {
                departmentYearInput.value = '';
                if(studentId.length > 0) {
                    studentIdInput.style.borderColor = 'red'; // Show validation error
                } else {
                    studentIdInput.style.borderColor = '';
                }
            }
        });
    }

    if (registerEmailInput && studentIdInput) {
        registerEmailInput.addEventListener('change', () => {
            const email = registerEmailInput.value.toLowerCase();
            const schoolEmailRegex = /^s(\d{8})@(?:gm2\.nutn\.edu\.tw|stumail\.nutn\.edu\.tw)$/;
            const match = email.match(schoolEmailRegex);
            if (match) {
                const studentId = `S${match[1]}`;
                studentIdInput.value = studentId;
                // Trigger the input event on studentId to auto-fill department/year
                studentIdInput.dispatchEvent(new Event('input'));
            }
        });
    }

    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload();
            if (!user.emailVerified) {
                await signOut(auth);
                const message = document.getElementById('loginMessage');
                if (message) {
                    message.textContent = '請先完成信箱驗證 / Please verify your email before logging in.';
                } else {
                    alert('請先完成信箱驗證 / Please verify your email before logging in.');
                }
                return;
            }
            const idToken = await getIdToken(user);
            try {
                const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${idToken}` } });
                const data = await res.json();
                if (data.loggedIn) {
                    window.location.href = 'services.html';
                }
            } catch (error) {
                console.error("Error checking /api/me", error);
            }
        }
    });

    // Panel switching logic
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const verifyPanel = document.getElementById('verifyPanel');

    function showPanel(panelToShow) {
        [loginForm, registerForm, verifyPanel].forEach(panel => {
            if(panel) panel.style.display = 'none';
        });
        if(panelToShow) panelToShow.style.display = '';
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

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
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
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await user.reload();

            if (!user.emailVerified) {
                message.textContent = '請先完成信箱驗證 / Please verify your email before logging in.';
                await fetch(`${API_URL}/api/verify/send-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                showVerificationForm(email);
                return;
            }

            message.textContent = '登入成功 / Login success!';
            window.location.href = 'memberPage.html';
        } catch (err) {
            console.error('Login error:', err);
            message.textContent = err.message || '登入失敗 / Login failed.';
        }
    });

    // Registration form submission
    registerForm.addEventListener('submit', async (e) => {
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
        if (!validateStudentId(studentId)) {
            message.textContent = '學號格式不正確，應為 S + 8位數字。';
            return;
        }
        message.textContent = '註冊中... / Registering...';

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const memberDocRef = doc(db, "members", user.uid);
            await setDoc(memberDocRef, {
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                displayName: memberName,
                phoneNumber: phone || "",
                disabled: false,
                metadata: {
                    creationTime: serverTimestamp(),
                    lastSignInTime: serverTimestamp()
                },
                studentId,
                gender,
                departmentYear,
                role: departmentYear && departmentYear.includes("電機") ? "本系會員" : "非本系會員",
                cumulativeConsumption: 0,
                isActive: "待驗證",
            });

            await fetch(`${API_URL}/api/verify/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            showVerificationForm(email, true);

        } catch (err) {
            console.error('Registration error:', err);
            message.textContent = err.message || '註冊失敗 / Register failed.';
        }
    });

    // Verification panel (the one that is part of the original HTML)
    const verifyPanelForm = document.getElementById('verifyPanel');
     verifyPanelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const verifyMessage = document.getElementById('verifyMessage');
        verifyMessage.textContent = '';
        const email = document.getElementById('verifyEmail').value.trim();
        const code = document.getElementById('verifyCode').value.trim();
        if (!email || !code) {
            verifyMessage.textContent = '請輸入 Email 與驗證碼 / Please enter email and code.';
            return;
        }
        await submitVerificationCode(email, code, verifyMessage);
    });

    function showVerificationForm(email, isNewRegistration = false) {
        const message = isNewRegistration ? `註冊成功，請輸入寄到 <b>${email}</b> 的 6 位數驗證碼` : `請輸入寄到 <b>${email}</b> 的 6 位數驗證碼`;

        loginForm.style.display = 'none';
        registerForm.innerHTML = `
            <div style="text-align:center;margin-bottom:10px;">${message}</div>
            <div class="verify-code-row">
                ${Array(6).fill('<input class="verify-code-input" type="text" maxlength="1" inputmode="numeric" pattern="\\d" autocomplete="one-time-code">').join('')}
                <button type="button" id="submitCodeBtn" class="verify-arrow-btn"><i class="fa-solid fa-arrow-right"></i></button>
            </div>
            <div class="form-message" id="dynamicVerifyMessage"></div>
        `;
        registerForm.style.display = '';

        loginTab.disabled = true;
        registerTab.disabled = true;
        registerTab.textContent = '驗證 Verify';

        const onSubmit = () => {
            const codeInputs = Array.from(document.querySelectorAll('.verify-code-input'));
            const code = codeInputs.map(inp => inp.value).join('');
            const verifyMessage = document.getElementById('dynamicVerifyMessage');
            if (code.length !== 6) {
                verifyMessage.textContent = '請輸入 6 位數驗證碼';
                return;
            }
            submitVerificationCode(email, code, verifyMessage, () => {
                 window.location.reload();
            });
        };

        setupCodeInputs(onSubmit);
        document.getElementById('submitCodeBtn').addEventListener('click', onSubmit);
    }

    async function submitVerificationCode(email, code, messageElement, onSuccessCallback) {
        try {
            const res = await fetch(`${API_URL}/api/verify/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await res.json();
            if (data.success) {
                messageElement.style.color = '#2e7d32';
                messageElement.textContent = '驗證成功！/ Verification success! 請重新登入。';
                if (onSuccessCallback) {
                    setTimeout(onSuccessCallback, 1500);
                }
            } else {
                messageElement.style.color = '#c62828';
                messageElement.textContent = data.error || data.message || '驗證失敗 / Verification failed.';
            }
        } catch (err) {
            messageElement.style.color = '#c62828';
            messageElement.textContent = '伺服器錯誤 / Server error.';
        }
    }

    function setupCodeInputs(onSubmit) {
        const codeInputs = Array.from(document.querySelectorAll('.verify-code-input'));
        codeInputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                const val = input.value.replace(/[^0-9]/g, '');
                input.value = val;
                if (val && idx < codeInputs.length - 1) {
                    codeInputs[idx + 1].focus();
                }
                if (codeInputs.every(inp => inp.value.length === 1)) {
                    onSubmit();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && idx > 0) {
                    codeInputs[idx - 1].focus();
                } else if (e.key >= '0' && e.key <= '9') {
                    input.value = '';
                }
            });
            input.addEventListener('paste', (e) => {
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                if (/^\d{6}$/.test(paste)) {
                    e.preventDefault();
                    for (let i = 0; i < 6; i++) {
                        codeInputs[i].value = paste[i];
                    }
                    codeInputs[5].focus();
                    onSubmit();
                }
            });
        });
    }
});