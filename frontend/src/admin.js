// 登入檢查，未登入則導回 login.html
fetch(`${API_URL}/api/me`, { credentials: 'include', })
  .then(res => res.json())
  .then(data => {
    if (!data.loggedIn) {
      window.location.href = 'login.html';
      return;
    }
    // data.user 裡有 name, email, role
    const identityPanel = document.querySelector('.identityPanel');
    identityPanel.innerHTML = `<p>當前登入身份：${data.user.role} ${data.user.name}</p>`;
    identityPanel.classList.remove('unauthorize');
    identityPanel.classList.add('authorized');
});

//介面控制
const funcPicker = document.querySelector('.funcPicker');
const panels = {
    '控制中心｜Dashboard': document.querySelector('.panel[data-dashboard]'),
    '歷史紀錄｜History': document.querySelector('.panel[data-history]'),
    '會員管理｜Members': document.querySelector('.panel[data-members]'),
    '活動管理｜Events': document.querySelector('.panel[data-events]'),
    '表單管理｜Forms': document.querySelector('.panel[data-forms]'),
    '金流管理｜Flow': document.querySelector('.panel[data-flow]'),
    '資源申請｜Apply': document.querySelector('.panel[data-apply]'),
    '偏好設定｜Settings': document.querySelector('.panel[data-settings]'),
};

function showPanel(selected) {
    Object.keys(panels).forEach(key => {
        if (key === selected) {
            panels[key].style.display = '';
        } else {
            panels[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showPanel(funcPicker.value);

// 監聽選擇變更
funcPicker.addEventListener('change', function() {
    showPanel(this.value);
});

//控制中心Dashboard

const publishNowCheckbox = document.querySelector('.publishNowCheckbox');
const arrangePublish = document.querySelector('.arrangePublish');

if(publishNowCheckbox.checked){
    arrangePublish.disabled = true;

}else if(!publishNowCheckbox.checked){
    arrangePublish.disabled = false;

}

publishNowCheckbox.addEventListener('change', function() {
    arrangePublish.disabled = this.checked;
});

async function fetchNews() {
    try {
        const response = await fetch(`${API_URL}/api/admin/news`, {
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const news = await response.json();
        populateNewsTable(news);
    } catch (error) {
        console.error('Failed to fetch news:', error);
    }
}

function populateNewsTable(news) {
    const tableBody = document.querySelector('.panel[data-dashboard] .news-table-body');
    if (!tableBody) {
        console.error('News table body not found');
        return;
    }

    tableBody.innerHTML = ''; // Clear existing rows

    news.forEach((item, index) => {
        const row = document.createElement('tr');
        const createDate = new Date(item.createDate).toLocaleString('zh-TW');
        const publishDate = new Date(item.publishDate).toLocaleString('zh-TW');

        row.innerHTML = `
            <td><input type="checkbox" class="visibility-checkbox" data-id="${item._id}" ${item.visibility ? 'checked' : ''}></td>
            <td>${index + 1}</td>
            <td>${item.type}</td>
            <td>${item.content}</td>
            <td>${createDate}</td>
            <td>${publishDate}</td>
            <td>${item.publisher}</td>
            <td><button class="delete-news-btn" data-id="${item._id}">刪除</button></td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners to checkboxes
    document.querySelectorAll('.visibility-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const newsId = event.target.dataset.id;
            const isVisible = event.target.checked;
            updateNewsVisibility(newsId, isVisible);
        });
    });

    document.querySelectorAll('.delete-news-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const newsId = event.target.dataset.id;
            if (confirm('確定要刪除這則消息嗎？')) {
                deleteNews(newsId);
            }
        });
    });
}

async function deleteNews(id) {
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to delete news');
        }

        fetchNews(); // Refresh the table
    } catch (error) {
        console.error('Error deleting news:', error);
        alert('刪除消息失敗');
    }
}

async function updateNewsVisibility(id, visibility) {
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ visibility }),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to update visibility');
        }
    } catch (error) {
        console.error('Error updating news visibility:', error);
        // Optionally, revert checkbox state on failure
        fetchNews();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchNews();
    fetchMembers();
    fetchHistory();
    fetchEvents();
    fetchForms();
    fetchEnrollments();
});

const addNewsButton = document.querySelector('.addNews');
addNewsButton.addEventListener('click', async () => {
    const newsType = document.querySelector('.newsType').value;
    const newsContent = document.getElementById('newsContent').value;
    const publishNow = document.querySelector('.publishNowCheckbox').checked;
    const publishDate = document.querySelector('.arrangePublish').value;

    if (!newsContent) {
        alert('消息內容為必填！');
        return;
    }

    const body = {
        type: newsType,
        content: newsContent,
        visibility: true,
        createDate: new Date().toISOString(),
        publishDate: publishNow ? new Date().toISOString() : new Date(publishDate).toISOString(),
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to add news');
        }

        document.getElementById('newsContent').value = '';
        fetchNews();
    } catch (error) {
        console.error('Error adding news:', error);
        alert('新增消息失敗');
    }
});

//會員管理Members

async function fetchMembers() {
    try {
        const response = await fetch(`${API_URL}/api/admin/members`,{
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const members = await response.json();
        populateMembersTable(members);
    } catch (error) {
        console.error('Failed to fetch members:', error);
    }
}

function populateMembersTable(members) {
    const tableBody = document.querySelector('.panel[data-members] .members-table-body');
    if (!tableBody) {
        console.error('Members table body not found');
        return;
    }

    tableBody.innerHTML = ''; // Clear existing rows

    members.forEach((item, index) => {
        const row = document.createElement('tr');
        const registerDate = new Date(item.registerDate).toLocaleString('zh-TW');
        const lastOnline = new Date(item.lastOnline).toLocaleString('zh-TW');

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item._id}</td>
            <td>${item.role}</td>
            <td>${item.name}</td>
            <td>${item.status}</td>
            <td>${item.studentId}</td>
            <td>${item.gender}</td>
            <td>${item.email}</td>
            <td>${item.phone}</td>
            <td>${item.departmentYear}</td>
            <td>${registerDate}</td>
            <td>${lastOnline}</td>
            <td>${item.cumulativeConsumption}</td>
            <td>${item.verification}</td>
            <td>
                <button class="edit-member-btn" data-id="${item._id}">編輯</button>
                <button class="revoke-member-btn" data-id="${item._id}">註銷</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners for revoke buttons
    document.querySelectorAll('.revoke-member-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const memberId = event.target.dataset.id;
            if (confirm('確定要註銷該會員資格嗎？')) {
                try {
                    const response = await fetch(`${API_URL}/api/admin/members/${memberId}`, {
                        method: 'DELETE',
                        credentials :'include'
                    });
                    if (!response.ok) throw new Error('Failed to revoke member');
                    alert('會員已註銷');
                    fetchMembers();
                } catch (err) {
                    alert('註銷失敗');
                }
            }
        });
    });

    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-member-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const memberId = event.target.dataset.id;
            const member = members.find(m => m._id === memberId);
            if (!member) return;
            // 彈窗編輯表單
            const newName = prompt('修改姓名', member.name);
            if (newName === null) return;
            const newEmail = prompt('修改Email', member.email);
            if (newEmail === null) return;
            const newPhone = prompt('修改電話', member.phone);
            if (newPhone === null) return;
            // 可擴充更多欄位
            fetch(`${API_URL}/api/admin/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone }),
                credentials: 'include',
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to update member');
                alert('會員資料已更新');
                fetchMembers();
            })
            .catch(() => alert('更新失敗'));
        });
    });
}

// 新增會員功能
const addMemberButton = document.querySelector('.panel[data-members] .addNews');
addMemberButton.addEventListener('click', async () => {
    const role = document.querySelector('.memberRole').value;
    const name = document.querySelector('.memberName').value;
    const status = document.querySelector('.memberStatus').value;
    const studentId = document.querySelector('.memberStudentId').value.toUpperCase();
    const departmentYear = document.querySelector('.memberDepartmentYear').value;
    const email = document.querySelector('.memberEmail').value.toLowerCase();
    const phone = document.querySelector('.memberPhone').value;
    const gender = document.querySelector('.memberGender').value;
    const verification = document.querySelector('.memberVerification').checked;

    if (!name) {
        alert('姓名為必填！');
        return;
    }

    const body = {
        role,
        name,
        status,
        studentId,
        departmentYear,
        email,
        phone,
        gender,
        verification,
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to add member');
        }
        alert("新增會員成功：<"+departmentYear+" "+name+">");

        // 清空表單
        document.querySelector('.memberRole').value = '本系會員';
        document.querySelector('.memberName').value = '';
        document.querySelector('.memberStatus').value = '待驗證';
        document.querySelector('.memberStudentId').value = '';
        document.querySelector('.memberDepartmentYear').value = '';
        document.querySelector('.memberEmail').value = '';
        document.querySelector('.memberPhone').value = '';
        document.querySelector('.memberGender').value = '生理男';
        document.querySelector('.memberVerification').checked = true;

        fetchMembers();
    } catch (error) {
        console.error('Error adding member:', error);
        alert('新增會員失敗');
    }
});

//歷史紀錄History
async function fetchHistory() {
    try {
        const response = await fetch(`${API_URL}/api/admin/history`, {
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const history = await response.json();
        populateHistoryTable(history);
    } catch (error) {
        console.error('Failed to fetch history:', error);
    }
}

function populateHistoryTable(history) {
    const tableBody = document.querySelector('.panel[data-history] .history-table-body');
    if (!tableBody) {
        console.error('History table body not found');
        return;
    }

    tableBody.innerHTML = ''; // Clear existing rows

    history.forEach((item, index) => {
        const row = document.createElement('tr');
        const alertDate = new Date(item.alertDate).toLocaleString('zh-TW');

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${alertDate}</td>
            <td>${item.alertPath}</td>
            <td>${item.content}</td>
            <td>${item.executer}</td>
            <td><input type="checkbox" class="confirm-checkbox" data-id="${item._id}" ${item.confirm ? 'checked' : ''}></td>
            <td>${item.securityChecker}</td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners for confirm checkboxes
    document.querySelectorAll('.confirm-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const historyId = event.target.dataset.id;
            const isConfirmed = event.target.checked;
            updateHistoryConfirmation(historyId, isConfirmed);
        });
    });
}

async function updateHistoryConfirmation(id, confirm) {
    try {
        const response = await fetch(`${API_URL}/api/admin/history/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ confirm }),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to update history confirmation');
        }

        fetchHistory();
    } catch (error) {
        console.error('Error updating history confirmation:', error);
        alert('更新確認狀態失敗');
        fetchHistory();
    }
}

//金流管理Flow

const incomeAndOutcome = document.querySelector('.incomeAndOutcome');
const flowOption = {
    '收入｜Income': document.querySelector('.incomeType'),
    '支出｜Outcome': document.querySelector('.outcomeType'),
    '轉帳｜Transfer': document.querySelector('.transferType'),
};

function showFlowOption(selected) {
    Object.keys(flowOption).forEach(key => {
        if (key === selected) {
            flowOption[key].style.display = 'block';
        } else {
            flowOption[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showFlowOption(incomeAndOutcome.value);

// 監聽選擇變更
incomeAndOutcome.addEventListener('change', function() {
    showFlowOption(this.value);
});

const logoutBtn = document.querySelector('.logoutBtn');
logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('isAdminLogin');
    fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('已登出 / Logged out');
        } else {
            console.error('登出失敗 / Logout failed:', data.message);
            alert('登出失敗 / Logout failed');
        }
    })
    .catch(error => {
        console.error('登出時發生錯誤 / Error during logout:', error);
        alert('登出時發生錯誤 / Error during logout');
    });
    window.location.href = 'login.html';
});

// 活動管理Events
const addEventButton = document.querySelector('.addEvent');
addEventButton.addEventListener('click', async () => {
    const imgUrl = document.querySelector('.eventImgUrl').value;
    const title = document.querySelector('.eventTitle').value;
    const hashtag = document.querySelector('.eventHashtag').value;
    const status = document.querySelector('.eventStatus').value;
    const content = document.querySelector('.eventContent').value;
    const nonMemberPrice = Number(document.querySelector('.eventNonMemberPrice').value) || 0;
    const memberPrice = Number(document.querySelector('.eventMemberPrice').value) || 0;
    const eventDate = document.querySelector('.eventDate').value;
    const restrictDepartment = document.querySelector('.restrictDepartment').value;
    const restrictYear = document.querySelector('.restrictYear').value;
    const restrictMember = document.querySelector('.restrictMember').checked;
    const restrictQuantity = Number(document.querySelector('.restrictQuantity').value) || 0;
    const location = document.querySelector('.location').value;
    const startEnrollDate = document.querySelector('.startEnrollDate').value;
    const endEnrollDate = document.querySelector('.endEnrollDate').value;

    if (!title || !content || !eventDate) {
        alert('活動標題、內文、日期為必填！');
        return;
    }

    const body = {
        imgUrl,
        title,
        hashtag,
        status,
        content,
        nonMemberPrice,
        memberPrice,
        eventDate: localDatetimeToISOString(eventDate),
        restrictDepartment,
        restrictYear,
        restrictMember,
        restrictQuantity,
        location,
        startEnrollDate: localDatetimeToISOString(startEnrollDate),
        endEnrollDate: localDatetimeToISOString(endEnrollDate),
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to add event');
        }
        alert('新增活動成功！');
        // 清空表單
        document.querySelector('.eventImgUrl').value = '';
        document.querySelector('.eventTitle').value = '';
        document.querySelector('.eventHashtag').value = '#聯合';
        document.querySelector('.eventStatus').value = '開放報名';
        document.querySelector('.eventContent').value = '';
        document.querySelector('.eventNonMemberPrice').value = 0;
        document.querySelector('.eventMemberPrice').value = 0;
        document.querySelector('.eventDate').value = '';
        document.querySelector('.restrictDepartment').value = '';
        document.querySelector('.restrictYear').value = '';
        document.querySelector('.restrictMember').checked = false;
        document.querySelector('.restrictQuantity').value = 0;
        document.querySelector('.location').value = '';
        document.querySelector('.startEnrollDate').value = '';
        document.querySelector('.endEnrollDate').value = '';
        fetchEvents(); // 若有活動列表可刷新
    } catch (error) {
        console.error('Error adding event:', error);
        alert('新增活動失敗');
    }
});

// 取得活動列表並渲染
async function fetchEvents() {
    try {
        const response = await fetch(`${API_URL}/api/admin/events`, {
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const events = await response.json();
        populateEventsTable(events);
    } catch (error) {
        console.error('Failed to fetch events:', error);
    }
}

function populateEventsTable(events) {
    const tableBody = document.querySelector('.panel[data-events] .events-table-body');
    if (!tableBody) {
        console.error('Events table body not found');
        return;
    }
    tableBody.innerHTML = '';
    events.forEach((item, index) => {
        const createDate = item.createDate ? new Date(item.createDate).toLocaleString('zh-TW') : '';
        const eventDate = item.eventDate ? new Date(item.eventDate).toLocaleString('zh-TW') : '';
        const startEnrollDate = item.startEnrollDate ? new Date(item.startEnrollDate).toLocaleString('zh-TW') : '';
        const endEnrollDate = item.endEnrollDate ? new Date(item.endEnrollDate).toLocaleString('zh-TW') : '';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="event-visibility-checkbox" data-id="${item._id}" ${item.visibility ? 'checked' : ''}></td>
            <td><a href="${item.imgUrl}" target="_blank">檢視圖片</a></td>
            <td>${item.title || ''}</td>
            <td>${item.hashtag || ''}</td>
            <td>${item.status || ''}</td>
            <td>${item.content || ''}</td>
            <td>${item.nonMemberPrice || 0}</td>
            <td>${item.memberPrice || 0}</td>
            <td>${item.publisher || ''}</td>
            <td>${createDate}</td>
            <td>${eventDate}</td>
            <td>${startEnrollDate}</td>
            <td>${endEnrollDate}</td>
            <td>${item.location || ''}</td>
            <td>${item.enrollQuantity || 0}</td>
            <td>${item.restrictDepartment || ''}</td>
            <td>${item.restrictYear || ''}</td>
            <td>${item.restrictMember ? '是' : '否'}</td>
            <td>${item.restrictQuantity || 0}</td>
            <td><button class="delete-event-btn" data-id="${item._id}">刪除</button></td>
        `;
        tableBody.appendChild(row);
    });
    // 綁定可見性切換
    document.querySelectorAll('.event-visibility-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const eventId = event.target.dataset.id;
            const isVisible = event.target.checked;
            updateEventVisibility(eventId, isVisible);
        });
    });
    // 綁定刪除事件
    document.querySelectorAll('.delete-event-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const eventId = event.target.dataset.id;
            if (confirm('確定要刪除此活動嗎？')) {
                try {
                    const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    if (!response.ok) throw new Error('Failed to delete event');
                    alert('活動已刪除');
                    fetchEvents();
                } catch (err) {
                    alert('刪除失敗');
                }
            }
        });
    });
}

// 新增活動可見性 PATCH function
async function updateEventVisibility(id, visibility) {
    try {
        const response = await fetch(`${API_URL}/api/admin/events/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ visibility }),
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to update event visibility');
        }
    } catch (error) {
        console.error('Error updating event visibility:', error);
        fetchEvents(); // 失敗時刷新
    }
}

// 修正 datetime-local 的時區問題
function localDatetimeToISOString(localStr) {
    if (!localStr) return undefined;
    const [date, time] = localStr.split('T');
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');
    const d = new Date(year, month - 1, day, hour, minute);
    return d.toISOString();
}

// 表單建立按鈕
const createFormBtn = document.getElementById('createFormBtn');
if (createFormBtn) {
    createFormBtn.addEventListener('click', function() {
        window.open('buildForms.html', '_blank');
    });
}

// 取得表單列表
async function fetchForms() {
    try {
        const response = await fetch(`${API_URL}/api/admin/forms`, {
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const forms = await response.json();
        populateFormsTable(forms);
    } catch (error) {
        console.error('Failed to fetch forms:', error);
    }
}

function populateFormsTable(forms) {
    const tableBody = document.querySelector('.forms-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    forms.forEach((form, idx) => {
        const createdAt = form.createdAt ? new Date(form.createdAt).toLocaleString('zh-TW') : '';
        const eventTitles = (form.eventTitles && form.eventTitles.length > 0) ? form.eventTitles.join(', ') : '-';
        const responseCount = form.responseCount || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${form.title || ''}</td>
            <td>${eventTitles}</td>
            <td>${responseCount}</td>
            <td>${createdAt}</td>
            <td><button class="delete-form-btn" data-id="${form._id}">刪除</button></td>
        `;
        tableBody.appendChild(tr);
    });
    document.querySelectorAll('.delete-form-btn').forEach(btn => {
        btn.addEventListener('click', async (event) => {
            const formId = event.target.dataset.id;
            if (confirm('確定要刪除此表單嗎？')) {
                await deleteForm(formId);
            }
        });
    });
}

async function deleteForm(formId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/forms/${formId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to delete form');
        fetchForms();
    } catch (error) {
        alert('刪除表單失敗');
    }
}

// 活動報名審核功能
async function fetchEnrollments() {
    try {
        const response = await fetch(`${API_URL}/api/admin/enrollments`, {
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const enrollments = await response.json();
        populateEnrollmentsTable(enrollments);
    } catch (error) {
        console.error('Failed to fetch enrollments:', error);
    }
}

function populateEnrollmentsTable(enrollments) {
    const tableBody = document.querySelector('.event-registration-table-body');
    if (!tableBody) {
        console.error('Enrollments table body not found');
        return;
    }

    tableBody.innerHTML = ''; // Clear existing rows

    enrollments.forEach((item, index) => {
        const row = document.createElement('tr');
        const submittedDate = new Date(item.submittedAt).toLocaleString('zh-TW');
        
        // 計算需付款金額（根據用戶身份判斷）
        const userRole = item.userDepartmentYear && item.userDepartmentYear.includes('電機') ? 'member' : 'nonMember';
        const paymentAmount = userRole === 'member' ? item.memberPrice : item.nonMemberPrice;

        // 從作答內容中提取付款方式
        const paymentMethod = item.answers && (item.answers['paymentMethod'] || item.answers['payments']) || '未選擇';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.userName}</td>
            <td>${item.userDepartmentYear}</td>
            <td>${item.eventTitle}</td>
            <td>NT$ ${paymentAmount}</td>
            <td>${paymentMethod}</td>
            <td><button class="view-answers-btn" data-id="${item._id}" data-answers='${JSON.stringify(item.answers)}' data-form-snapshot='${JSON.stringify(item.formSnapshot)}'>查看作答內容</button></td>
            <td>
                <select class="payment-status-select" data-id="${item._id}" style="padding: 2px 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <option value="未付款" ${item.paymentStatus === '未付款' ? 'selected' : ''}>未付款</option>
                    <option value="已付款" ${item.paymentStatus === '已付款' ? 'selected' : ''}>已付款</option>
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners for payment status selects
    document.querySelectorAll('.payment-status-select').forEach(select => {
        select.addEventListener('change', (event) => {
            const enrollmentId = event.target.dataset.id;
            const paymentStatus = event.target.value;
            updatePaymentStatus(enrollmentId, paymentStatus);
        });
    });

    // Add event listeners for view answers buttons
    document.querySelectorAll('.view-answers-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const answers = JSON.parse(event.target.dataset.answers);
            const formSnapshot = JSON.parse(event.target.dataset.formSnapshot);
            const enrollmentId = event.target.dataset.id;
            const enrollment = enrollments.find(e => e._id === enrollmentId);
            showAnswersModal(answers, formSnapshot, enrollment);
        });
    });
}

async function updatePaymentStatus(id, paymentStatus) {
    try {
        const response = await fetch(`${API_URL}/api/admin/enrollments/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentStatus }),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to update payment status');
        }

        // 不刷新整個表格，只更新當前選項的狀態
        console.log(`付款狀態已更新為: ${paymentStatus}`);
    } catch (error) {
        console.error('Error updating payment status:', error);
        alert('更新付款狀態失敗');
        fetchEnrollments(); // Refresh to revert changes
    }
}

function showAnswersModal(answers, formSnapshot, enrollment) {
    // 創建模態框
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
    `;

    let answersHtml = '<h3>作答內容</h3>';
    
    if (formSnapshot && formSnapshot.fields) {
        // 根據表單欄位顯示作答內容
        formSnapshot.fields.forEach(field => {
            const fieldId = field.id;
            const fieldLabel = field.label || fieldId;
            const answer = answers[fieldId];
            
            if (answer !== undefined) {
                answersHtml += `
                    <div style="margin-bottom: 15px;">
                        <strong>${fieldLabel}:</strong><br>
                        <span style="color: #666;">${Array.isArray(answer) ? answer.join(', ') : answer}</span>
                    </div>
                `;
            }
        });
    } else {
        // 如果沒有表單快照，直接顯示所有作答
        Object.keys(answers).forEach(key => {
            const answer = answers[key];
            answersHtml += `
                <div style="margin-bottom: 15px;">
                    <strong>${key}:</strong><br>
                    <span style="color: #666;">${Array.isArray(answer) ? answer.join(', ') : answer}</span>
                </div>
            `;
        });
    }

    // 新增付款方式詳細資訊
    answersHtml += '<hr style="margin: 20px 0; border: 1px solid #eee;">';
    answersHtml += '<h4>付款方式詳細資訊</h4>';
    
    // 從作答內容中提取付款方式相關資訊
    const paymentMethod = answers['paymentMethod'] || answers['payments'] || '未選擇';
    answersHtml += `
        <div style="margin-bottom: 15px;">
            <strong>付款方式:</strong><br>
            <span style="color: #666;">${paymentMethod}</span>
        </div>
    `;

    // 如果是轉帳，顯示轉帳相關資訊
    if (paymentMethod === '轉帳' || paymentMethod.includes('轉帳')) {
        const bankCode = answers['bankCode'] || '未填寫';
        const account = answers['account'] || '未填寫';
        
        answersHtml += `
            <div style="margin-bottom: 15px;">
                <strong>銀行代碼:</strong><br>
                <span style="color: #666;">${bankCode}</span>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>轉帳帳號:</strong><br>
                <span style="color: #666;">${account}</span>
            </div>
        `;
    }

    modalContent.innerHTML = answersHtml + `
        <div style="text-align: center; margin-top: 20px;">
            <button onclick="this.closest('.modal').remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">關閉</button>
        </div>
    `;

    modal.className = 'modal';
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 點擊背景關閉模態框
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });


}