document.addEventListener('DOMContentLoaded', async () => {
    // 檢查登入狀態
    try {
        const loginRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
        const loginData = await loginRes.json();
        
        if (!loginData.loggedIn) {
            alert('請先登入後再填寫表單');
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        alert('驗證登入狀態時發生錯誤');
        window.location.href = 'login.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    
    if (!eventId) {
        alert('未經授權的訪問');
        window.location.href = 'services.html';
        return;
    }

    try {
        // 取得活動資料
        const eventRes = await fetch(`${API_URL}/api/events`);
        const events = await eventRes.json();
        const event = events.find(e => e._id === eventId);
        
        if (!event) {
            document.querySelector('.content').innerHTML = '<p>找不到對應的活動</p>';
            return;
        }

        // 檢查活動是否有綁定表單
        if (!event.formId) {
            document.querySelector('.content').innerHTML = '<p>此活動尚未設定報名表單</p>';
            return;
        }

        // 取得表單資料
        const formRes = await fetch(`${API_URL}/api/forms/${event.formId}`);
        if (!formRes.ok) {
            document.querySelector('.content').innerHTML = '<p>無法載入表單</p>';
            return;
        }
        
        const form = await formRes.json();
        
        // 檢查是否已經提交過表單
        const checkRes = await fetch(`${API_URL}/api/responses/check/${eventId}/${event.formId}`, {
            credentials: 'include'
        });
        const checkResult = await checkRes.json();
        
        if (checkResult.submitted) {
            // 已經提交過，顯示已提交的訊息
            showAlreadySubmittedMessage(event, checkResult.submittedAt);
        } else {
            // 未提交過，顯示表單
            renderForm(form, event);
        }
        
    } catch (error) {
        console.error('Error loading form:', error);
        document.querySelector('.content').innerHTML = '<p>載入表單時發生錯誤</p>';
    }
});



function showAlreadySubmittedMessage(event, submittedAt) {
    const content = document.querySelector('.content');
    const submittedDate = new Date(submittedAt).toLocaleString('zh-TW');
    
    content.innerHTML = `
        <div class="already-submitted-container">
            <div class="already-submitted-message">
                <h2>${event.title} - 報名表單</h2>
                <div class="submitted-info">
                    <p><strong>您已經提交過此表單</strong></p>
                    <p>提交時間：${submittedDate}</p>
                    <p>每個活動只能提交一次表單，無法重複填寫。</p>
                </div>
                <div class="action-buttons">
                    <button onclick="history.back()" class="back-btn">返回上一頁</button>
                </div>
            </div>
        </div>
    `;
}

function renderForm(form, event) {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="form-container">
            <h2>${event.title} - 報名表單</h2>
            <p class="form-description">${form.description || ''}</p>
            <form id="enrollmentForm">
                ${form.fields.map(field => renderField(field)).join('')}
                <button type="submit">下一步：確認支付細節</button>
            </form>
        </div>
    `;

    // 綁定表單提交事件
    document.getElementById('enrollmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitForm(form._id, event._id);
    });
}

function renderField(field) {
    const required = field.required ? 'required' : '';
    const requiredLabel = field.required ? ' <span class="required-star">*</span>' : '';
    
    switch (field.type) {
        case 'input':
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    <input type="text" name="${field.id}" ${required}>
                </div>
            `;
        case 'textarea':
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    <textarea name="${field.id}" ${required}></textarea>
                </div>
            `;
        case 'radio':
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    ${field.options.map(option => `
                        <label class="radio-option">
                            <input type="radio" name="${field.id}" value="${option}" ${required}>
                            ${option}
                        </label>
                    `).join('')}
                </div>
            `;
        case 'checkbox':
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    ${field.options.map(option => `
                        <label class="checkbox-option">
                            <input type="checkbox" name="${field.id}" value="${option}">
                            ${option}
                        </label>
                    `).join('')}
                </div>
            `;
        case 'select':
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    <select name="${field.id}" ${required}>
                        <option value="">請選擇</option>
                        ${field.options.map(option => `
                            <option value="${option}">${option}</option>
                        `).join('')}
                    </select>
                </div>
            `;
        case 'date':
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    <input type="date" name="${field.id}" ${required}>
                </div>
            `;
        case 'file':
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    <input type="file" name="${field.id}" ${required}>
                </div>
            `;
        default:
            return `
                <div class="form-field">
                    <label>${field.label}${requiredLabel}</label>
                    <input type="text" name="${field.id}" ${required}>
                </div>
            `;
    }
}

async function submitForm(formId, eventId) {
    try {
        // 收集表單資料
        const formData = new FormData(document.getElementById('enrollmentForm'));
        const answers = {};
        
        for (const [key, value] of formData.entries()) {
            if (answers[key]) {
                // 如果是 checkbox，轉成陣列
                if (Array.isArray(answers[key])) {
                    answers[key].push(value);
                } else {
                    answers[key] = [answers[key], value];
                }
            } else {
                answers[key] = value;
            }
        }

        // 取得表單快照
        const formRes = await fetch(`${API_URL}/api/forms/${formId}`);
        const formSnapshot = await formRes.json();

        // 送出回應
        const response = await fetch(`${API_URL}/api/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                activityId: eventId,
                formId: formId,
                answers: answers,
                formSnapshot: formSnapshot
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
                // 重複提交錯誤
                alert(errorData.error);
                // 重新載入頁面顯示已提交訊息
                window.location.reload();
                return;
            }
            throw new Error('表單提交失敗！');
        }

        alert('表單已送出！！');
        window.location.href = `payments.html?eventId=${eventId}`;
        
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('提交失敗，請稍後再試');
    }
}
