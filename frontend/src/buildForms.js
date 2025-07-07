document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    // 若有 formId，載入表單
    editingFormId = getFormIdFromUrl();
    if (editingFormId) {
        await loadFormForEdit(editingFormId);
    }
});

async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
        const data = await res.json();
        if (!data.loggedIn) {
            alert('未經授權的訪問！');
            window.location.href = 'login.html';
            return;
        }
        // 驗證通過才載入活動與設計器
        fetchEventsForSelect();
        initFormBuilder();
    } catch (err) {
        alert('驗證身份時發生錯誤');
    }
}

async function fetchEventsForSelect() {
    const select = document.getElementById('eventSelect');
    if (!select) return;
    try {
        const response = await fetch(`${API_URL}/api/admin/events`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch events');
        const events = await response.json();
        // 清空舊選項，保留第一個
        select.innerHTML = '<option value="">請選擇活動</option>';
        events.forEach(ev => {
            const option = document.createElement('option');
            option.value = ev._id;
            option.textContent = ev.title || '(無標題)';
            select.appendChild(option);
        });
    } catch (err) {
        select.innerHTML = '<option value="">載入活動失敗</option>';
    }
}

// ===== 表單設計器核心 =====
let fields = [];
let editingFormId = null;

function getFormIdFromUrl() {
    const url = new URL(window.location.href);
    return url.searchParams.get('formId');
}

async function loadFormForEdit(formId) {
    try {
        const res = await fetch(`${API_URL}/api/admin/forms/${formId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('無法載入表單');
        const form = await res.json();
        document.getElementById('formTitle').value = form.title || '';
        document.getElementById('formDesc').value = form.description || '';
        fields = (form.fields || []).map(f => ({...f}));
        renderFields();
        // 關聯活動選單自動選擇
        if (form.eventId && document.getElementById('eventSelect')) {
            const eventSelect = document.getElementById('eventSelect');
            // 先檢查選單內有無該活動
            let found = false;
            for (let i = 0; i < eventSelect.options.length; i++) {
                if (eventSelect.options[i].value === form.eventId) {
                    eventSelect.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                // 若活動不在選單，新增一個選項
                const opt = document.createElement('option');
                opt.value = form.eventId;
                opt.textContent = form.eventTitles && form.eventTitles.length > 0 ? form.eventTitles[0] : '(未知活動)';
                opt.selected = true;
                eventSelect.appendChild(opt);
            }
        }
    } catch (err) {
        alert('載入表單失敗：' + err.message);
    }
}

function initFormBuilder() {
    document.getElementById('addFieldBtn').addEventListener('click', addField);
    document.getElementById('saveFormBtn').addEventListener('click', saveForm);
    renderFields();
}

function addField() {
    fields.push({
        id: 'f_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        label: '',
        type: 'input',
        required: false,
        options: [],
        order: fields.length
    });
    renderFields();
}

function removeField(idx) {
    fields.splice(idx, 1);
    renderFields();
}

function renderFields() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = '';
    fields.forEach((field, idx) => {
        const div = document.createElement('div');
        div.className = 'field-item';
        div.innerHTML = `
            <label>題目：<input type="text" value="${field.label}" data-idx="${idx}" class="field-label"></label>
            <label>型別：
                <select data-idx="${idx}" class="field-type">
                    <option value="input" ${field.type==='input'?'selected':''}>單行文字</option>
                    <option value="textarea" ${field.type==='textarea'?'selected':''}>多行文字</option>
                    <option value="radio" ${field.type==='radio'?'selected':''}>單選</option>
                    <option value="checkbox" ${field.type==='checkbox'?'selected':''}>多選</option>
                    <option value="select" ${field.type==='select'?'selected':''}>下拉選單</option>
                    <option value="date" ${field.type==='date'?'selected':''}>日期</option>
                    <option value="file" ${field.type==='file'?'selected':''}>檔案上傳</option>
                </select>
            </label>
            <label>必填：<input type="checkbox" data-idx="${idx}" class="field-required" ${field.required?'checked':''}></label>
            <span class="field-options-area" style="display:${['radio','checkbox','select'].includes(field.type)?'':'none'}">
                <label>選項（逗號分隔）：<input type="text" value="${field.options.join(',')}" data-idx="${idx}" class="field-options"></label>
            </span>
            <button type="button" class="remove-field-btn" data-idx="${idx}">刪除</button>
        `;
        list.appendChild(div);
    });
    // 綁定事件
    document.querySelectorAll('.field-label').forEach(input => {
        input.addEventListener('input', e => {
            const idx = +e.target.dataset.idx;
            fields[idx].label = e.target.value;
        });
    });
    document.querySelectorAll('.field-type').forEach(sel => {
        sel.addEventListener('change', e => {
            const idx = +e.target.dataset.idx;
            fields[idx].type = e.target.value;
            if (!['radio','checkbox','select'].includes(fields[idx].type)) fields[idx].options = [];
            renderFields();
        });
    });
    document.querySelectorAll('.field-required').forEach(chk => {
        chk.addEventListener('change', e => {
            const idx = +e.target.dataset.idx;
            fields[idx].required = e.target.checked;
        });
    });
    document.querySelectorAll('.field-options').forEach(input => {
        input.addEventListener('input', e => {
            const idx = +e.target.dataset.idx;
            fields[idx].options = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
        });
    });
    document.querySelectorAll('.remove-field-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const idx = +e.target.dataset.idx;
            removeField(idx);
        });
    });
}

async function saveForm() {
    const title = document.getElementById('formTitle').value.trim();
    const description = document.getElementById('formDesc').value.trim();
    const eventId = document.getElementById('eventSelect').value;
    if (!title) {
        alert('表單標題為必填');
        return;
    }
    if (!eventId) {
        alert('請選擇要關聯的活動');
        return;
    }
    // 檢查題目
    if (fields.length === 0) {
        alert('請至少新增一個題目');
        return;
    }
    for (const f of fields) {
        if (!f.label) {
            alert('所有題目都必須有標籤');
            return;
        }
    }
    // 組合 payload
    const payload = {
        title,
        description,
        fields: fields.map((f, i) => ({
            ...f,
            order: i
        })),
        eventId
    };
    try {
        if (editingFormId) {
            // PATCH 更新
            const res = await fetch(`${API_URL}/api/admin/forms/${editingFormId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('更新表單失敗');
            alert('表單已更新！');
            window.close();
        } else {
            // 建立表單
            const res = await fetch(`${API_URL}/api/admin/forms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('建立表單失敗');
            const form = await res.json();
            alert('表單已建立並關聯活動！');
            window.location.href = 'admin.html';
        }
    } catch (err) {
        alert('儲存失敗：' + err.message);
    }
}
