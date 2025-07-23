// admin-conference.js
// 會議記錄管理功能

let conferenceRecords = [];

// 載入會議記錄列表
async function loadConferenceRecords() {
    window.showLoading();
    try {
        const user = await getCurrentUserAsync();
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/admin/conference-records`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
        });
        if (!res.ok) {
            throw new Error('Failed to fetch conference records');
        }
        conferenceRecords = await res.json();
        renderConferenceRecordsTable();
    } catch (err) {
        console.error('載入會議記錄失敗:', err);
        alert('載入會議記錄失敗，請重試');
    } finally {
        window.hideLoading();
    }
}

// 渲染會議記錄表格
function renderConferenceRecordsTable() {
    const tableBody = document.querySelector('.conference-admin-table-body');
    if (!tableBody) return;

    if (conferenceRecords.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666;">暫無會議記錄</td></tr>';
        return;
    }

    tableBody.innerHTML = conferenceRecords.map((record, index) => `
        <tr data-id="${record.id}">
            <td>${index + 1}</td>
            <td>
                <span class="filename-display">${record.fileName}</span>
                <input type="text" class="filename-edit" value="${record.fileName}" style="display:none;">
            </td>
            <td>
                <span class="category-display">${record.category}</span>
                <select class="category-edit" style="display:none;">
                    <option value="會議記錄" ${record.category === '會議記錄' ? 'selected' : ''}>會議記錄</option>
                </select>
            </td>
            <td>${new Date(record.uploadDate).toLocaleDateString('zh-TW')}</td>
            <td>${formatFileSize(record.fileSize)}</td>
            <td><button class="download-btn" data-url="${record.downloadUrl}">下載</button></td>
            <td>
                <button class="edit-btn" data-id="${record.id}">編輯</button>
                <button class="save-btn" data-id="${record.id}" style="display:none;">保存</button>
                <button class="cancel-btn" data-id="${record.id}" style="display:none;">取消</button>
            </td>
            <td><button class="delete-btn" data-id="${record.id}" style="color: red;">刪除</button></td>
        </tr>
    `).join('');

    // 添加事件監聽器
    attachRecordTableEventListeners();
}

// 附加表格事件監聽器
function attachRecordTableEventListeners() {
    const tableBody = document.querySelector('.conference-admin-table-body');
    if (!tableBody) return;

    tableBody.addEventListener('click', async (e) => {
        const recordId = e.target.dataset.id;
        const row = e.target.closest('tr');

        if (e.target.classList.contains('download-btn')) {
            // 下載檔案
            const url = e.target.dataset.url;
            window.open(url, '_blank');
        }
        else if (e.target.classList.contains('edit-btn')) {
            // 進入編輯模式
            enterEditMode(row);
        }
        else if (e.target.classList.contains('save-btn')) {
            // 保存編輯
            await saveRecordEdit(recordId, row);
        }
        else if (e.target.classList.contains('cancel-btn')) {
            // 取消編輯
            exitEditMode(row);
        }
        else if (e.target.classList.contains('delete-btn')) {
            // 刪除檔案
            if (confirm('確定要刪除這個會議記錄嗎？此操作無法撤銷。')) {
                await deleteRecord(recordId);
            }
        }
    });
}

// 進入編輯模式
function enterEditMode(row) {
    const filenameDisplay = row.querySelector('.filename-display');
    const filenameEdit = row.querySelector('.filename-edit');
    const categoryDisplay = row.querySelector('.category-display');
    const categoryEdit = row.querySelector('.category-edit');
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    const cancelBtn = row.querySelector('.cancel-btn');

    filenameDisplay.style.display = 'none';
    filenameEdit.style.display = 'inline';
    categoryDisplay.style.display = 'none';
    categoryEdit.style.display = 'inline';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline';
    cancelBtn.style.display = 'inline';
}

// 退出編輯模式
function exitEditMode(row) {
    const filenameDisplay = row.querySelector('.filename-display');
    const filenameEdit = row.querySelector('.filename-edit');
    const categoryDisplay = row.querySelector('.category-display');
    const categoryEdit = row.querySelector('.category-edit');
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    const cancelBtn = row.querySelector('.cancel-btn');

    // 恢復原始值
    const record = conferenceRecords.find(r => r.id === row.dataset.id);
    if (record) {
        filenameEdit.value = record.fileName;
        categoryEdit.value = record.category;
    }

    filenameDisplay.style.display = 'inline';
    filenameEdit.style.display = 'none';
    categoryDisplay.style.display = 'inline';
    categoryEdit.style.display = 'none';
    editBtn.style.display = 'inline';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
}

// 保存編輯
async function saveRecordEdit(recordId, row) {
    const newFileName = row.querySelector('.filename-edit').value.trim();
    const newCategory = row.querySelector('.category-edit').value;

    if (!newFileName) {
        alert('檔案名稱不能為空');
        return;
    }

    try {
        window.showLoading();
        const user = await getCurrentUserAsync();
        const idToken = await user.getIdToken();

        const res = await fetch(`${API_URL}/api/admin/conference-records/${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                fileName: newFileName,
                category: newCategory
            })
        });

        if (!res.ok) {
            throw new Error('更新失敗');
        }

        // 更新本地數據
        const record = conferenceRecords.find(r => r.id === recordId);
        if (record) {
            record.fileName = newFileName;
            record.category = newCategory;
        }

        // 更新顯示
        row.querySelector('.filename-display').textContent = newFileName;
        row.querySelector('.category-display').textContent = newCategory;

        exitEditMode(row);
        alert('更新成功');
    } catch (err) {
        console.error('更新會議記錄失敗:', err);
        alert('更新失敗，請重試');
    } finally {
        window.hideLoading();
    }
}

// 刪除記錄
async function deleteRecord(recordId) {
    try {
        window.showLoading();
        const user = await getCurrentUserAsync();
        const idToken = await user.getIdToken();

        const res = await fetch(`${API_URL}/api/admin/conference-records/${recordId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });

        if (!res.ok) {
            throw new Error('刪除失敗');
        }

        // 從本地數據中移除
        conferenceRecords = conferenceRecords.filter(r => r.id !== recordId);
        renderConferenceRecordsTable();
        alert('刪除成功');
    } catch (err) {
        console.error('刪除會議記錄失敗:', err);
        alert('刪除失敗，請重試');
    } finally {
        window.hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', ()=>{
    // 初始化：檔案選擇時就顯示名稱
    const fileInput = document.querySelector('.recordFileInput');
    const fileNameInput = document.querySelector('.recordFileName');

    fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files.length > 0) {
        const file = files[0];
        fileNameInput.value = file.name;
    } else {
        fileNameInput.value = '';
    }
    });

});



// 上傳會議記錄
async function uploadConferenceRecord() {
  const fileInput = document.querySelector('.recordFileInput');
  const fileNameInput = document.querySelector('.recordFileName');
  const categorySelect = document.querySelector('.recordCategory');

  const files = fileInput.files;
  if (files.length === 0) {
    alert('請先選擇檔案');
    return;
  }

  const file = files[0];
  const fileName = file.name;
  const category = categorySelect.value;

  try {
    window.showLoading();
    const user = await getCurrentUserAsync();
    const idToken = await user.getIdToken();

    const storage = firebase.storage();
    const storageRef = storage.ref();
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const storagePath = `sa_meetings/${timestamp}_${fileName}.${fileExtension}`;
    const fileRef = storageRef.child(storagePath);

    const snapshot = await fileRef.put(file);
    const downloadUrl = await snapshot.ref.getDownloadURL();

    const recordData = {
      fileName: fileName,
      category: category,
      originalFileName: file.name,
      fileSize: file.size,
      storagePath: storagePath,
      downloadUrl: downloadUrl,
      uploadDate: new Date().toISOString()
    };

    const res = await fetch(`${API_URL}/api/admin/conference-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(recordData)
    });

    if (!res.ok) throw new Error('保存記錄失敗');

    // Reset
    fileNameInput.value = '';
    fileInput.value = '';
    categorySelect.selectedIndex = 0;

    await loadConferenceRecords();
    alert('上傳成功！');
  } catch (err) {
    console.error('上傳失敗:', err);
    alert('上傳失敗，請重試');
  } finally {
    window.hideLoading();
  }
}

// 格式化檔案大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 初始化會議記錄管理
function initConferenceRecords() {
    // 上傳按鈕事件
    const uploadBtn = document.querySelector('.uploadRecordBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadConferenceRecord);
    }

    // 載入會議記錄列表
    loadConferenceRecords();
}

// 導出函數供 admin.js 使用
window.initConferenceRecords = initConferenceRecords;
window.loadConferenceRecords = loadConferenceRecords;