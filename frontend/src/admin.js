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
        eventDate,
        restrictDepartment,
        restrictYear,
        restrictMember,
        restrictQuantity
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
        // TODO: fetchEvents(); // 若有活動列表可刷新
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