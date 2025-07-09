// 登入檢查，未登入則導回 login.html
fetch(`${API_URL}/api/me`, { credentials: "include", })
  .then(res => res.json())
  .then(data => {
    if (!data.loggedIn) {
      window.location.href = "login.html";
      return;
    }
    // data.user 裡有 name, email, role
    const identityPanel = document.querySelector(".identityPanel");
    identityPanel.innerHTML = `<p>當前登入身份：${data.user.role} ${data.user.name}</p>`;
    identityPanel.classList.remove("unauthorize");
    identityPanel.classList.add("authorized");
});

//介面控制
const funcPicker = document.querySelector(".funcPicker");
const panels = {
    "控制中心｜Dashboard": document.querySelector(".panel[data-dashboard]"),
    "歷史紀錄｜History": document.querySelector(".panel[data-history]"),
    "會員管理｜Members": document.querySelector(".panel[data-members]"),
    "活動管理｜Events": document.querySelector(".panel[data-events]"),
    "表單管理｜Forms": document.querySelector(".panel[data-forms]"),
    "金流管理｜Flow": document.querySelector(".panel[data-flow]"),
    "資源申請｜Apply": document.querySelector(".panel[data-apply]"),
    "美食地圖｜Maps": document.querySelector(".panel[data-maps]"),
    "偏好設定｜Settings": document.querySelector(".panel[data-settings]"),
};

function showPanel(selected) {
    Object.keys(panels).forEach(key => {
        if (key === selected) {
            panels[key].style.display = "";
            // 根據 panel 名稱呼叫對應 fetch
            switch (key) {
                case "控制中心｜Dashboard":
                    fetchNews();
                    break;
                case "會員管理｜Members":
                    fetchMembers();
                    break;
                case "歷史紀錄｜History":
                    fetchHistory();
                    break;
                case "活動管理｜Events":
                    fetchEvents();
                    break;
                case "表單管理｜Forms":
                    fetchForms();
                    break;
                case "資源申請｜Apply":
                    fetchEnrollments();
                    break;
                case "美食地圖｜Maps":
                    fetchMapItems();
                    break;
                case "金流管理｜Flow":
                    // 若有需要可加 fetchFlow();
                    break;
                case "偏好設定｜Settings":
                    // 若有需要可加 fetchSettings();
                    break;
                default:
                    break;
            }
        } else {
            panels[key].style.display = "none";
        }
    });
}

// 頁面初始時只呼叫預設 panel 的 fetch
showPanel(funcPicker.value);

// 監聽選擇變更
funcPicker.addEventListener("change", function() {
    showPanel(this.value);
});

//控制中心Dashboard

const publishNowCheckbox = document.querySelector(".publishNowCheckbox");
const arrangePublish = document.querySelector(".arrangePublish");

if(publishNowCheckbox.checked){
    arrangePublish.disabled = true;

}else if(!publishNowCheckbox.checked){
    arrangePublish.disabled = false;

}

publishNowCheckbox.addEventListener("change", function() {
    arrangePublish.disabled = this.checked;
});

const NEWS_TYPES = ["重要通知", "系會資訊", "活動快訊", "會員專屬"]; // 正確分類

async function fetchNews() {
    try {
        const response = await fetch(`${API_URL}/api/admin/news`, {
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const news = await response.json();
        populateNewsTable(news);
    } catch (error) {
        console.error("Failed to fetch news:", error);
    }
}

function populateNewsTable(news) {
    const tableBody = document.querySelector(".panel[data-dashboard] .news-table-body");
    if (!tableBody) {
        console.error("News table body not found");
        return;
    }

    tableBody.innerHTML = ""; // Clear existing rows

    news.forEach((item, index) => {
        const row = document.createElement("tr");
        const createDate = new Date(item.createDate).toLocaleString("zh-TW");
        const publishDate = new Date(item.publishDate).toLocaleString("zh-TW");

        // 動態產生 type select
        let typeOptions = NEWS_TYPES.map(type => `<option value="${type}" ${item.type === type ? "selected" : ""}>${type}</option>`).join("");
        // 消息內容加修改按鈕
        row.innerHTML = `
            <td><input type="checkbox" class="visibility-checkbox" data-id="${item._id}" ${item.visibility ? "checked" : ""}></td>
            <td>${index + 1}</td>
            <td><select class="news-type-select" data-id="${item._id}">${typeOptions}</select></td>
            <td><span class="news-content" data-id="${item._id}">${item.content}</span> <button class="edit-news-content-btn" data-id="${item._id}">修改</button></td>
            <td>${createDate}</td>
            <td>${publishDate}</td>
            <td>${item.publisher}</td>
            <td><button class="delete-news-btn" data-id="${item._id}">刪除</button></td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners to checkboxes
    document.querySelectorAll(".visibility-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const newsId = event.target.dataset.id;
            const isVisible = event.target.checked;
            updateNewsVisibility(newsId, isVisible);
        });
    });

    document.querySelectorAll(".delete-news-btn").forEach(button => {
        button.addEventListener("click", (event) => {
            const newsId = event.target.dataset.id;
            if (confirm("確定要刪除這則消息嗎？")) {
                deleteNews(newsId);
            }
        });
    });

    // 新增：type select 變更
    document.querySelectorAll(".news-type-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const newsId = event.target.dataset.id;
            const newType = event.target.value;
            updateNewsField(newsId, "type", newType);
        });
    });

    // 新增：content 修改按鈕
    document.querySelectorAll(".edit-news-content-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const newsId = event.target.dataset.id;
            const contentSpan = document.querySelector(`.news-content[data-id="${newsId}"]`);
            const oldContent = contentSpan ? contentSpan.textContent : "";
            const newContent = prompt("請輸入新的消息內容", oldContent);
            if (newContent !== null && newContent !== oldContent) {
                updateNewsField(newsId, "content", newContent);
            }
        });
    });
}

async function deleteNews(id) {
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: "DELETE",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to delete news");
        }

        fetchNews(); // Refresh the table
    } catch (error) {
        console.error("Error deleting news:", error);
        alert("刪除消息失敗");
    }
}

async function updateNewsVisibility(id, visibility) {
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ visibility }),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to update visibility");
        }
    } catch (error) {
        console.error("Error updating news visibility:", error);
        // Optionally, revert checkbox state on failure
        fetchNews();
    }
}

// 新增：單欄位 PATCH
async function updateNewsField(newsId, field, value) {
    try {
        const body = {};
        body[field] = value;
        const response = await fetch(`${API_URL}/api/admin/news/${newsId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to update news");
        fetchNews(); // 更新表格
    } catch (err) {
        alert("更新失敗");
    }
}

//會員管理Members

const MEMBER_ROLES = ["管理員", "系學會成員", "本系會員", "非本系會員", "訪客"];
const MEMBER_GENDERS = ["生理男", "生理女", "其他"];

async function fetchMembers() {
    try {
        const response = await fetch(`${API_URL}/api/admin/members`,{
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const members = await response.json();
        populateMembersTable(members);
    } catch (error) {
        console.error("Failed to fetch members:", error);
    }
}

function populateMembersTable(members) {
    const tableBody = document.querySelector(".panel[data-members] .members-table-body");
    if (!tableBody) {
        console.error("Members table body not found");
        return;
    }

    tableBody.innerHTML = ""; // Clear existing rows

    members.forEach((item, index) => {
        const row = document.createElement("tr");
        const registerDate = new Date(item.registerDate).toLocaleString("zh-TW");
        const lastOnline = new Date(item.lastOnline).toLocaleString("zh-TW");

        // 產生 select options
        let roleOptions = MEMBER_ROLES.map(role => `<option value="${role}" ${item.role === role ? "selected" : ""}>${role}</option>`).join("");
        let genderOptions = MEMBER_GENDERS.map(gender => `<option value="${gender}" ${item.gender === gender ? "selected" : ""}>${gender}</option>`).join("");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item._id}</td>
            <td><select class="member-role-select" data-id="${item._id}">${roleOptions}</select></td>
            <td><span class="member-name" data-id="${item._id}">${item.name}</span> <button class="edit-member-name-btn" data-id="${item._id}">修改</button></td>
            <td>${item.status}</td>
            <td><span class="member-studentid" data-id="${item._id}">${item.studentId}</span> <button class="edit-member-studentid-btn" data-id="${item._id}">修改</button></td>
            <td><select class="member-gender-select" data-id="${item._id}">${genderOptions}</select></td>
            <td><span class="member-email" data-id="${item._id}">${item.email}</span> <button class="edit-member-email-btn" data-id="${item._id}">修改</button></td>
            <td><span class="member-phone" data-id="${item._id}">${item.phone}</span> <button class="edit-member-phone-btn" data-id="${item._id}">修改</button></td>
            <td><span class="member-departmentyear" data-id="${item._id}">${item.departmentYear}</span> <button class="edit-member-departmentyear-btn" data-id="${item._id}">修改</button></td>
            <td>${registerDate}</td>
            <td>${lastOnline}</td>
            <td><span class="member-cumulative" data-id="${item._id}">${item.cumulativeConsumption}</span> <button class="edit-member-cumulative-btn" data-id="${item._id}">修改</button></td>
            <td><input type="checkbox" class="member-verification-checkbox" data-id="${item._id}" ${item.verification ? "checked" : ""}></td>
            <td>
                <button class="revoke-member-btn" data-id="${item._id}">註銷</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // 註銷功能保留
    document.querySelectorAll(".revoke-member-btn").forEach(button => {
        button.addEventListener("click", async (event) => {
            const memberId = event.target.dataset.id;
            if (confirm("確定要註銷該會員資格嗎？")) {
                try {
                    const response = await fetch(`${API_URL}/api/admin/members/${memberId}`, {
                        method: "DELETE",
                        credentials :"include"
                    });
                    if (!response.ok) throw new Error("Failed to revoke member");
                    alert("會員已註銷");
                    fetchMembers();
                } catch (err) {
                    alert("註銷失敗");
                }
            }
        });
    });

    // 身份 select
    document.querySelectorAll(".member-role-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const memberId = event.target.dataset.id;
            const newRole = event.target.value;
            updateMemberField(memberId, "role", newRole);
        });
    });
    // 性別 select
    document.querySelectorAll(".member-gender-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const memberId = event.target.dataset.id;
            const newGender = event.target.value;
            updateMemberField(memberId, "gender", newGender);
        });
    });
    // 名稱
    document.querySelectorAll(".edit-member-name-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-name[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新名稱", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "name", newValue);
            }
        });
    });
    // 學號
    document.querySelectorAll(".edit-member-studentid-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-studentid[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新學號", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "studentId", newValue);
            }
        });
    });
    // Email
    document.querySelectorAll(".edit-member-email-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-email[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新Email", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "email", newValue);
            }
        });
    });
    // 電話
    document.querySelectorAll(".edit-member-phone-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-phone[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新電話", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "phone", newValue);
            }
        });
    });
    // 系級
    document.querySelectorAll(".edit-member-departmentyear-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-departmentyear[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新系級", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "departmentYear", newValue);
            }
        });
    });
    // 累計消費金額
    document.querySelectorAll(".edit-member-cumulative-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-cumulative[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新累計消費金額", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "cumulativeConsumption", newValue);
            }
        });
    });
    // 已驗證 checkbox
    document.querySelectorAll(".member-verification-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const memberId = event.target.dataset.id;
            const newValue = event.target.checked;
            updateMemberField(memberId, "verification", newValue);
        });
    });
}

// 單欄位 PATCH
async function updateMemberField(memberId, field, value) {
    try {
        const body = {};
        body[field] = value;
        const response = await fetch(`${API_URL}/api/admin/members/${memberId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to update member");
        fetchMembers();
    } catch (err) {
        alert("更新失敗");
    }
}

// 新增會員功能
const addMemberButton = document.querySelector(".panel[data-members] .addNews");
addMemberButton.addEventListener("click", async () => {
    const role = document.querySelector(".memberRole").value;
    const name = document.querySelector(".memberName").value;
    const status = document.querySelector(".memberStatus").value;
    const studentId = document.querySelector(".memberStudentId").value.toUpperCase();
    const departmentYear = document.querySelector(".memberDepartmentYear").value;
    const email = document.querySelector(".memberEmail").value.toLowerCase();
    const phone = document.querySelector(".memberPhone").value;
    const gender = document.querySelector(".memberGender").value;
    const verification = document.querySelector(".memberVerification").checked;

    if (!name) {
        alert("姓名為必填！");
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
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to add member");
        }
        alert("新增會員成功：<"+departmentYear+" "+name+">");

        // 清空表單
        document.querySelector(".memberRole").value = "本系會員";
        document.querySelector(".memberName").value = "";
        document.querySelector(".memberStatus").value = "待驗證";
        document.querySelector(".memberStudentId").value = "";
        document.querySelector(".memberDepartmentYear").value = "";
        document.querySelector(".memberEmail").value = "";
        document.querySelector(".memberPhone").value = "";
        document.querySelector(".memberGender").value = "生理男";
        document.querySelector(".memberVerification").checked = true;

        fetchMembers();
    } catch (error) {
        console.error("Error adding member:", error);
        alert("新增會員失敗");
    }
});

//歷史紀錄History
async function fetchHistory() {
    try {
        const response = await fetch(`${API_URL}/api/admin/history`, {
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const history = await response.json();
        populateHistoryTable(history);
    } catch (error) {
        console.error("Failed to fetch history:", error);
    }
}

function populateHistoryTable(history) {
    const tableBody = document.querySelector(".panel[data-history] .history-table-body");
    if (!tableBody) {
        console.error("History table body not found");
        return;
    }

    tableBody.innerHTML = ""; // Clear existing rows

    history.forEach((item, index) => {
        const row = document.createElement("tr");
        const alertDate = new Date(item.alertDate).toLocaleString("zh-TW");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${alertDate}</td>
            <td>${item.alertPath}</td>
            <td>${item.content}</td>
            <td>${item.executer}</td>
            <td><input type="checkbox" class="confirm-checkbox" data-id="${item._id}" ${item.confirm ? "checked" : ""}></td>
            <td>${item.securityChecker}</td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners for confirm checkboxes
    document.querySelectorAll(".confirm-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const historyId = event.target.dataset.id;
            const isConfirmed = event.target.checked;
            updateHistoryConfirmation(historyId, isConfirmed);
        });
    });
}

async function updateHistoryConfirmation(id, confirm) {
    try {
        const response = await fetch(`${API_URL}/api/admin/history/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ confirm }),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to update history confirmation");
        }

        fetchHistory();
    } catch (error) {
        console.error("Error updating history confirmation:", error);
        alert("更新確認狀態失敗");
        fetchHistory();
    }
}

//金流管理Flow

const incomeAndOutcome = document.querySelector(".incomeAndOutcome");
const flowOption = {
    "收入｜Income": document.querySelector(".incomeType"),
    "支出｜Outcome": document.querySelector(".outcomeType"),
    "轉帳｜Transfer": document.querySelector(".transferType"),
};

function showFlowOption(selected) {
    Object.keys(flowOption).forEach(key => {
        if (key === selected) {
            flowOption[key].style.display = "block";
        } else {
            flowOption[key].style.display = "none";
        }
    });
}

// 初始化顯示
showFlowOption(incomeAndOutcome.value);

// 監聽選擇變更
incomeAndOutcome.addEventListener("change", function() {
    showFlowOption(this.value);
});

const logoutBtn = document.querySelector(".logoutBtn");
logoutBtn.addEventListener("click", function() {
    localStorage.removeItem("isAdminLogin");
    fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("已登出 / Logged out");
        } else {
            console.error("登出失敗 / Logout failed:", data.message);
            alert("登出失敗 / Logout failed");
        }
    })
    .catch(error => {
        console.error("登出時發生錯誤 / Error during logout:", error);
        alert("登出時發生錯誤 / Error during logout");
    });
    window.location.href = "login.html";
});

// 活動管理Events
const addEventButton = document.querySelector(".addEvent");
addEventButton.addEventListener("click", async () => {
    const imgUrl = document.querySelector(".eventImgUrl").value;
    const title = document.querySelector(".eventTitle").value;
    const hashtag = document.querySelector(".eventHashtag").value;
    const status = document.querySelector(".eventStatus").value;
    const content = document.querySelector(".eventContent").value;
    const nonMemberPrice = Number(document.querySelector(".eventNonMemberPrice").value) || 0;
    const memberPrice = Number(document.querySelector(".eventMemberPrice").value) || 0;
    const eventDate = document.querySelector(".eventDate").value;
    const restrictDepartment = document.querySelector(".restrictDepartment").value;
    const restrictYear = document.querySelector(".restrictYear").value;
    const restrictMember = document.querySelector(".restrictMember").checked;
    const restrictQuantity = Number(document.querySelector(".restrictQuantity").value) || 0;
    const location = document.querySelector(".location").value;
    const startEnrollDate = document.querySelector(".startEnrollDate").value;
    const endEnrollDate = document.querySelector(".endEnrollDate").value;

    if (!title || !content || !eventDate) {
        alert("活動標題、內文、日期為必填！");
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
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to add event");
        }
        alert("新增活動成功！");
        // 清空表單
        document.querySelector(".eventImgUrl").value = "";
        document.querySelector(".eventTitle").value = "";
        document.querySelector(".eventHashtag").value = "#聯合";
        document.querySelector(".eventStatus").value = "開放報名";
        document.querySelector(".eventContent").value = "";
        document.querySelector(".eventNonMemberPrice").value = 0;
        document.querySelector(".eventMemberPrice").value = 0;
        document.querySelector(".eventDate").value = "";
        document.querySelector(".restrictDepartment").value = "";
        document.querySelector(".restrictYear").value = "";
        document.querySelector(".restrictMember").checked = false;
        document.querySelector(".restrictQuantity").value = 0;
        document.querySelector(".location").value = "";
        document.querySelector(".startEnrollDate").value = "";
        document.querySelector(".endEnrollDate").value = "";
        fetchEvents(); // 若有活動列表可刷新
    } catch (error) {
        console.error("Error adding event:", error);
        alert("新增活動失敗");
    }
});

// 取得活動列表並渲染
async function fetchEvents() {
    try {
        const response = await fetch(`${API_URL}/api/admin/events`, {
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const events = await response.json();
        populateEventsTable(events);
    } catch (error) {
        console.error("Failed to fetch events:", error);
    }
}

const EVENT_HASHTAGS = ["#賽事", "#聯合", "#實習"];
const EVENT_STATUS = ["尚未開始", "開放報名", "即將開始", "活動結束"];

function populateEventsTable(events) {
    const tableBody = document.querySelector(".panel[data-events] .events-table-body");
    if (!tableBody) {
        console.error("Events table body not found");
        return;
    }
    tableBody.innerHTML = "";
    events.forEach((item, index) => {
        const createDate = item.createDate ? new Date(item.createDate).toLocaleString("zh-TW") : "";
        const eventDate = item.eventDate ? new Date(item.eventDate).toISOString().slice(0,16) : "";
        const startEnrollDate = item.startEnrollDate ? new Date(item.startEnrollDate).toISOString().slice(0,16) : "";
        const endEnrollDate = item.endEnrollDate ? new Date(item.endEnrollDate).toISOString().slice(0,16) : "";
        let hashtagOptions = EVENT_HASHTAGS.map(tag => `<option value="${tag}" ${item.hashtag === tag ? "selected" : ""}>${tag}</option>`).join("");
        let statusOptions = EVENT_STATUS.map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`).join("");
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="checkbox" class="event-visibility-checkbox" data-id="${item._id}" ${item.visibility ? "checked" : ""}></td>
            <td><span class="event-imgurl" data-id="${item._id}"><a href="${item.imgUrl}" target="_blank">${item.imgUrl ? "檢視圖片" : "無"}</a></span> <button class="edit-event-imgurl-btn" data-id="${item._id}">修改</button></td>
            <td><span class="event-title" data-id="${item._id}">${item.title || ""}</span> <button class="edit-event-title-btn" data-id="${item._id}">修改</button></td>
            <td><select class="event-hashtag-select" data-id="${item._id}">${hashtagOptions}</select></td>
            <td><select class="event-status-select" data-id="${item._id}">${statusOptions}</select></td>
            <td><span class="event-content" data-id="${item._id}">${item.content || ""}</span> <button class="edit-event-content-btn" data-id="${item._id}">修改</button></td>
            <td><span class="event-nonmemberprice" data-id="${item._id}">${item.nonMemberPrice || 0}</span> <button class="edit-event-nonmemberprice-btn" data-id="${item._id}">修改</button></td>
            <td><span class="event-memberprice" data-id="${item._id}">${item.memberPrice || 0}</span> <button class="edit-event-memberprice-btn" data-id="${item._id}">修改</button></td>
            <td>${item.publisher || ""}</td>
            <td>${createDate}</td>
            <td><input type="datetime-local" class="event-date-input" data-id="${item._id}" value="${eventDate}"></td>
            <td><input type="datetime-local" class="event-startenroll-input" data-id="${item._id}" value="${startEnrollDate}"></td>
            <td><input type="datetime-local" class="event-endenroll-input" data-id="${item._id}" value="${endEnrollDate}"></td>
            <td><span class="event-location" data-id="${item._id}">${item.location || ""}</span> <button class="edit-event-location-btn" data-id="${item._id}">修改</button></td>
            <td>${item.enrollQuantity || 0}</td>
            <td><span class="event-restrictdepartment" data-id="${item._id}">${item.restrictDepartment || ""}</span> <button class="edit-event-restrictdepartment-btn" data-id="${item._id}">修改</button></td>
            <td><span class="event-restrictyear" data-id="${item._id}">${item.restrictYear || ""}</span> <button class="edit-event-restrictyear-btn" data-id="${item._id}">修改</button></td>
            <td><input type="checkbox" class="event-restrictmember-checkbox" data-id="${item._id}" ${item.restrictMember ? "checked" : ""}></td>
            <td><span class="event-restrictquantity" data-id="${item._id}">${item.restrictQuantity || 0}</span> <button class="edit-event-restrictquantity-btn" data-id="${item._id}">修改</button></td>
            <td><button class="delete-event-btn" data-id="${item._id}">刪除</button></td>
        `;
        tableBody.appendChild(row);
    });

    // 綁定所有 inline 編輯事件
    // 圖片連結
    document.querySelectorAll(".edit-event-imgurl-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-imgurl[data-id="${eventId}"] a`);
            const oldValue = span ? span.getAttribute("href") : "";
            const newValue = prompt("請輸入新的圖片連結", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "imgUrl", newValue);
            }
        });
    });
    // 標題
    document.querySelectorAll(".edit-event-title-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-title[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新標題", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "title", newValue);
            }
        });
    });
    // 內文
    document.querySelectorAll(".edit-event-content-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-content[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新活動內文", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "content", newValue);
            }
        });
    });
    // 非會員價格
    document.querySelectorAll(".edit-event-nonmemberprice-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-nonmemberprice[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新非會員價格", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "nonMemberPrice", Number(newValue));
            }
        });
    });
    // 會員價格
    document.querySelectorAll(".edit-event-memberprice-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-memberprice[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新會員價格", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "memberPrice", Number(newValue));
            }
        });
    });
    // 地點
    document.querySelectorAll(".edit-event-location-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-location[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新地點", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "location", newValue);
            }
        });
    });
    // 年級限制
    document.querySelectorAll(".edit-event-restrictyear-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-restrictyear[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新年級限制", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "restrictYear", newValue);
            }
        });
    });
    // 系別限制
    document.querySelectorAll(".edit-event-restrictdepartment-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-restrictdepartment[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新系別限制", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "restrictDepartment", newValue);
            }
        });
    });
    // 人數限制
    document.querySelectorAll(".edit-event-restrictquantity-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-restrictquantity[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新活動人數限制", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "restrictQuantity", Number(newValue));
            }
        });
    });
    // 活動類別 select
    document.querySelectorAll(".event-hashtag-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "hashtag", newValue);
        });
    });
    // 活動狀態 select
    document.querySelectorAll(".event-status-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "status", newValue);
        });
    });
    // 會員限制 checkbox
    document.querySelectorAll(".event-restrictmember-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.checked;
            updateEventField(eventId, "restrictMember", newValue);
        });
    });
    // 日期 input
    document.querySelectorAll(".event-date-input").forEach(input => {
        input.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "eventDate", newValue);
        });
    });
    document.querySelectorAll(".event-startenroll-input").forEach(input => {
        input.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "startEnrollDate", newValue);
        });
    });
    document.querySelectorAll(".event-endenroll-input").forEach(input => {
        input.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "endEnrollDate", newValue);
        });
    });
    // 可見性 checkbox
    document.querySelectorAll(".event-visibility-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const isVisible = event.target.checked;
            updateEventField(eventId, "visibility", isVisible);
        });
    });
    // 刪除事件
    document.querySelectorAll(".delete-event-btn").forEach(button => {
        button.addEventListener("click", async (event) => {
            const eventId = event.target.dataset.id;
            if (confirm("確定要刪除此活動嗎？")) {
                try {
                    const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
                        method: "DELETE",
                        credentials: "include",
                    });
                    if (!response.ok) throw new Error("Failed to delete event");
                    alert("活動已刪除");
                    fetchEvents();
                } catch (err) {
                    alert("刪除失敗");
                }
            }
        });
    });
}

// 單欄位 PATCH（整合 visibility 與一般欄位）
async function updateEventField(eventId, field, value) {
    try {
        const body = {};
        body[field] = value;
        const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to update event");
        fetchEvents();
    } catch (err) {
        alert("更新失敗");
    }
}

// 修正 datetime-local 的時區問題
function localDatetimeToISOString(localStr) {
    if (!localStr) return undefined;
    const [date, time] = localStr.split("T");
    const [year, month, day] = date.split("-");
    const [hour, minute] = time.split(":");
    const d = new Date(year, month - 1, day, hour, minute);
    return d.toISOString();
}

// 表單建立按鈕
const createFormBtn = document.getElementById("createFormBtn");
if (createFormBtn) {
    createFormBtn.addEventListener("click", function() {
        window.open("buildForms.html", "_blank");
    });
}

// 取得表單列表
async function fetchForms() {
    try {
        const response = await fetch(`${API_URL}/api/admin/forms`, {
            credentials: "include",
        });
        if (!response.ok) throw new Error("Network response was not ok");
        const forms = await response.json();
        populateFormsTable(forms);
    } catch (error) {
        console.error("Failed to fetch forms:", error);
    }
}

function populateFormsTable(forms) {
    const tableBody = document.querySelector(".forms-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    forms.forEach((form, idx) => {
        const createdAt = form.createdAt ? new Date(form.createdAt).toLocaleString("zh-TW") : "";
        const eventTitles = (form.eventTitles && form.eventTitles.length > 0) ? form.eventTitles.join(", ") : "-";
        const responseCount = form.responseCount || 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${form.title || ""}</td>
            <td>${eventTitles}</td>
            <td>${responseCount}</td>
            <td>${createdAt}</td>
            <td><button class="edit-form-btn" data-id="${form._id}">編輯</button> <button class="delete-form-btn" data-id="${form._id}">刪除</button></td>
        `;
        tableBody.appendChild(tr);
    });
    document.querySelectorAll(".delete-form-btn").forEach(btn => {
        btn.addEventListener("click", async (event) => {
            const formId = event.target.dataset.id;
            if (confirm("確定要刪除此表單嗎？")) {
                await deleteForm(formId);
            }
        });
    });
    // 新增：編輯按鈕
    document.querySelectorAll(".edit-form-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const formId = event.target.dataset.id;
            window.open(`buildForms.html?formId=${formId}`, "_blank");
        });
    });
}

async function deleteForm(formId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/forms/${formId}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to delete form");
        fetchForms();
    } catch (error) {
        alert("刪除表單失敗");
    }
}

// 活動報名審核功能
async function fetchEnrollments() {
    try {
        const response = await fetch(`${API_URL}/api/admin/enrollments`, {
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const enrollments = await response.json();
        populateEnrollmentsTable(enrollments);
    } catch (error) {
        console.error("Failed to fetch enrollments:", error);
    }
}

function populateEnrollmentsTable(enrollments) {
    const tableBody = document.querySelector(".event-registration-table-body");
    if (!tableBody) {
        console.error("Enrollments table body not found");
        return;
    }

    tableBody.innerHTML = ""; // Clear existing rows

    enrollments.forEach((item, index) => {
        const row = document.createElement("tr");
        const submittedDate = new Date(item.submittedAt).toLocaleString("zh-TW");
        
        // 計算需付款金額（根據用戶身份判斷）
        const userRole = item.userDepartmentYear && item.userDepartmentYear.includes("電機") ? "member" : "nonMember";
        const paymentAmount = userRole === "member" ? item.memberPrice : item.nonMemberPrice;

        // 修正付款方式顯示邏輯
        const paymentMethod =
            item.paymentMethod ||
            (item.answers && (item.answers["paymentMethod"] || item.answers["payments"])) ||
            "未選擇";
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.userName}</td>
            <td>${item.userDepartmentYear}</td>
            <td>${item.eventTitle}</td>
            <td>NT$ ${paymentAmount}</td>
            <td>${paymentMethod}</td>
            <td><button class="view-answers-btn" data-id="${item._id}" data-answers="${JSON.stringify(item.answers)}" data-form-snapshot="${JSON.stringify(item.formSnapshot)}">查看作答內容</button></td>
            <td>
                <select class="payment-status-select" data-id="${item._id}" style="padding: 2px 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <option value="未付款" ${item.paymentStatus === "未付款" ? "selected" : ""}>未付款</option>
                    <option value="已付款" ${item.paymentStatus === "已付款" ? "selected" : ""}>已付款</option>
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners for payment status selects
    document.querySelectorAll(".payment-status-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const enrollmentId = event.target.dataset.id;
            const paymentStatus = event.target.value;
            updatePaymentStatus(enrollmentId, paymentStatus);
        });
    });

    // Add event listeners for view answers buttons
    document.querySelectorAll(".view-answers-btn").forEach(button => {
        button.addEventListener("click", (event) => {
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
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ paymentStatus }),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to update payment status");
        }

        // 不刷新整個表格，只更新當前選項的狀態
        console.log(`付款狀態已更新為: ${paymentStatus}`);
    } catch (error) {
        console.error("Error updating payment status:", error);
        alert("更新付款狀態失敗");
        fetchEnrollments(); // Refresh to revert changes
    }
}

function showAnswersModal(answers, formSnapshot, enrollment) {
    // 創建模態框
    const modal = document.createElement("div");
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

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        min-width: 200px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
    `;

    let answersHtml = "<h3>作答內容</h3>";
    
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
                        <span style="color: #666;">${Array.isArray(answer) ? answer.join(", ") : answer}</span>
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
                    <span style="color: #666;">${Array.isArray(answer) ? answer.join(", ") : answer}</span>
                </div>
            `;
        });
    }

    // 新增付款方式詳細資訊
    answersHtml += "<hr style='margin: 20px 0; border: 1px solid #eee;'>";
    answersHtml += "<h4>付款方式詳細資訊</h4>";
    
    // 修正付款方式顯示邏輯
    const paymentMethod =
        (answers["paymentMethod"] || answers["payments"]) ||
        (enrollment && enrollment.paymentMethod) ||
        "未選擇";
    answersHtml += `
        <div style="margin-bottom: 15px;">
            <strong>付款方式:</strong><br>
            <span style="color: #666;">${paymentMethod}</span>
        </div>
    `;

    // 如果是轉帳，顯示轉帳相關資訊（從 paymentNotes 解析）
    if (paymentMethod === "轉帳" || paymentMethod.includes("轉帳")) {
        let bankCode = "未填寫";
        let account = "未填寫";
        if (enrollment && enrollment.paymentNotes) {
            // 格式為 <銀行代碼>｜<帳號>
            const parts = enrollment.paymentNotes.split("｜");
            if (parts.length === 2) {
                bankCode = parts[0] || "未填寫";
                account = parts[1] || "未填寫";
            }
        }
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
            <button onclick="this.closest(".modal").remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">關閉</button>
        </div>
    `;

    modal.className = "modal";
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 點擊背景關閉模態框
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ====== 美食地圖 Maps 新增地標功能 ======
// 1. 動態營業時段表格
const openingHoursList = document.querySelector(".openingHoursList tbody");
const addOpeningHoursBtn = document.querySelector(".addOpeningHours");

addOpeningHoursBtn.addEventListener("click", function() {
  // 移除「無資料」行
  const noDataRow = openingHoursList.querySelector("tr td[colspan]");
  if (noDataRow) openingHoursList.innerHTML = "";

  // 新增一行
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <select class="openingDay">
        <option value="monday">星期一</option>
        <option value="tuesday">星期二</option>
        <option value="wednesday">星期三</option>
        <option value="thursday">星期四</option>
        <option value="friday">星期五</option>
        <option value="saturday">星期六</option>
        <option value="sunday">星期日</option>
      </select>
    </td>
    <td><input type="time" class="openingTime"></td>
    <td><input type="time" class="closingTime"></td>
    <td><button type="button" class="removeOpeningHours">移除</button></td>
  `;
  openingHoursList.appendChild(tr);
});

openingHoursList.addEventListener("click", function(e) {
  if (e.target.classList.contains("removeOpeningHours")) {
    e.target.closest("tr").remove();
    // 若刪到沒資料，補回「無資料」
    if (openingHoursList.children.length === 0) {
      const emptyTr = document.createElement("tr");
      emptyTr.innerHTML = `<td colspan="4" style="text-align: center;">無資料</td>`;
      openingHoursList.appendChild(emptyTr);
    }
  }
});

// ====== 新增：美食地圖地標列表與編輯功能 ======
const MAP_CATEGORIES = ["A級美食嘉年華", "B級美食嘉年華", "咖啡廳及甜點店"];

async function fetchMapItems() {
  try {
    const res = await fetch(`${API_URL}/api/admin/maps`, { credentials: "include" });
    if (!res.ok) throw new Error("無法取得地標列表");
    const items = await res.json();
    populateMapItemsTable(items);
  } catch (err) {
    alert("載入地標失敗");
  }
}

function populateMapItemsTable(items) {
  const tableBody = document.querySelector(".panel[data-maps] .mapitems-table-body");
  if (!tableBody) return;
  tableBody.innerHTML = "";
  items.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const photoUrl = (item.photos && item.photos.length > 0 && item.photos[0].url) ? item.photos[0].url : "";
    let categoryOptions = MAP_CATEGORIES.map(cat => `<option value="${cat}" ${item.category === cat ? "selected" : ""}>${cat}</option>`).join("");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><select class="mapitem-category-select" data-id="${item._id}">${categoryOptions}</select></td>
      <td><span class="mapitem-description" data-id="${item._id}">${item.description || ""}</span></td>
      <td><span class="mapitem-googlemapurl" data-id="${item._id}">${item.googleMapUrl || ""}</span> <button class="edit-mapitem-googlemapurl-btn" data-id="${item._id}">修改</button></td>
      <td><span class="mapitem-menuurl" data-id="${item._id}">${item.menuUrl || ""}</span></td>
      <td><span class="mapitem-photo" data-id="${item._id}">${photoUrl ? `<a href="${photoUrl}" target="_blank">檢視</a>` : "無"}</span></td>
      <td><button class="delete-mapitem-btn" data-id="${item._id}">刪除</button></td>
    `;
    tableBody.appendChild(tr);
  });
  // 編輯按鈕
  document.querySelectorAll(".mapitem-category-select").forEach(select => {
    select.addEventListener("change", (e) => {
      const id = select.dataset.id;
      const newValue = select.value;
      updateMapItemField(id, "category", newValue);
    });
  });
  document.querySelectorAll(".edit-mapitem-googlemapurl-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = btn.dataset.id;
      const span = document.querySelector(`.mapitem-googlemapurl[data-id="${id}"]`);
      const oldValue = span ? span.textContent : "";
      const newValue = prompt("請輸入新的 Google map 連結", oldValue);
      if (newValue !== null && newValue !== oldValue) updateMapItemField(id, "googleMapUrl", newValue);
    });
  });
  document.querySelectorAll(".delete-mapitem-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = btn.dataset.id;
      if (confirm("確定要刪除此地標嗎？")) await deleteMapItem(id);
    });
  });
}

// PATCH 單欄位
async function updateMapItemField(id, field, value) {
  try {
    const body = {};
    body[field] = value;
    const res = await fetch(`${API_URL}/api/admin/maps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    if (!res.ok) throw new Error("更新失敗");
    fetchMapItems();
  } catch (err) {
    alert("更新失敗");
  }
}

// 刪除地標
async function deleteMapItem(id) {
  try {
    const res = await fetch(`${API_URL}/api/admin/maps/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("刪除失敗");
    fetchMapItems();
  } catch (err) {
    alert("刪除失敗");
  }
}

// 彈窗編輯營業時段
function showOpeningHoursModal(id, openingHours) {
  // 建立 modal
  const modal = document.createElement("div");
  modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `background: white; padding: 20px; border-radius: 8px; min-width: 300px; max-width: 90vw; max-height: 80vh; overflow-y: auto;`;
  // 內容
  let html = `<h3>營業時段</h3><table style="width:100%;"><thead><tr><th>星期</th><th>開</th><th>關</th><th>操作</th></tr></thead><tbody class="modal-openinghours-tbody">`;
  if (openingHours.length === 0) {
    html += `<tr><td colspan="4" style="text-align:center;">無資料</td></tr>`;
  } else {
    openingHours.forEach((h, i) => {
      html += `<tr>
        <td><select class="modal-openingDay">
          <option value="monday" ${h.day==="monday"?"selected":""}>星期一</option>
          <option value="tuesday" ${h.day==="tuesday"?"selected":""}>星期二</option>
          <option value="wednesday" ${h.day==="wednesday"?"selected":""}>星期三</option>
          <option value="thursday" ${h.day==="thursday"?"selected":""}>星期四</option>
          <option value="friday" ${h.day==="friday"?"selected":""}>星期五</option>
          <option value="saturday" ${h.day==="saturday"?"selected":""}>星期六</option>
          <option value="sunday" ${h.day==="sunday"?"selected":""}>星期日</option>
        </select></td>
        <td><input type="time" class="modal-openingTime" value="${h.open||""}"></td>
        <td><input type="time" class="modal-closingTime" value="${h.close||""}"></td>
        <td><button type="button" class="modal-removeOpeningHours">移除</button></td>
      </tr>`;
    });
  }
  html += `</tbody></table><button class="modal-addOpeningHours">新增時段</button>`;
  html += `<div style="text-align:center;margin-top:20px;"><button class="modal-saveOpeningHours" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">儲存</button> <button class="modal-closeOpeningHours" style="padding:8px 16px;background:#aaa;color:white;border:none;border-radius:4px;cursor:pointer;">關閉</button></div>`;
  modalContent.innerHTML = html;
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  // 新增/移除行
  const tbody = modalContent.querySelector(".modal-openinghours-tbody");
  modalContent.querySelector(".modal-addOpeningHours").addEventListener("click", () => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><select class="modal-openingDay">
        <option value="monday">星期一</option>
        <option value="tuesday">星期二</option>
        <option value="wednesday">星期三</option>
        <option value="thursday">星期四</option>
        <option value="friday">星期五</option>
        <option value="saturday">星期六</option>
        <option value="sunday">星期日</option>
      </select></td>
      <td><input type="time" class="modal-openingTime"></td>
      <td><input type="time" class="modal-closingTime"></td>
      <td><button type="button" class="modal-removeOpeningHours">移除</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-removeOpeningHours")) {
      e.target.closest("tr").remove();
      if (tbody.children.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="4" style="text-align:center;">無資料</td>`;
        tbody.appendChild(noDataRow);
      }
    }
  });
  // 儲存
  modalContent.querySelector(".modal-saveOpeningHours").addEventListener("click", () => {
    // 收集資料
    const rows = tbody.querySelectorAll("tr");
  const hours = [];
  rows.forEach(row => {
      const daySel = row.querySelector(".modal-openingDay");
      const openInput = row.querySelector(".modal-openingTime");
      const closeInput = row.querySelector(".modal-closingTime");
    if (daySel && openInput && closeInput) {
        hours.push({ day: daySel.value, open: openInput.value, close: closeInput.value, closed: false });
    }
  });
    updateMapItemField(id, "openingHours", hours);
    modal.remove();
  });
  // 關閉
  modalContent.querySelector(".modal-closeOpeningHours").addEventListener("click", () => {
    modal.remove();
  });
  // 點擊背景關閉
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

const addRestaurantBtn = document.querySelector(".addRestaurant");
addRestaurantBtn.addEventListener("click", async function() {
  const category = document.querySelector(".restaurantType").value;
  const description = document.querySelector(".restaurantDescription").value;
  const googleMapUrl = document.querySelector(".restaurantGoogleMapUrl").value;
  const menuUrl = document.querySelector(".restaurantMenuUrl").value;

  if (!category || !description || !googleMapUrl) {
    alert("請填寫所有必填欄位");
    return;
  }

  // 解析 Google map連結取得 placeId
  const placeId = extractPlaceIdFromUrl(googleMapUrl);
  if (!placeId) {
    alert("Google map連結格式錯誤，請確認連結中包含 place_id");
    return;
  }

  // 透過 Google Places API 取得詳細資訊
  let placeData;
  try {
    placeData = await fetchGooglePlaceDetails(placeId);
  } catch (err) {
    alert("Google Places API 取得資料失敗");
    return;
  }

  // 組合要送出的資料
  const body = {
    category,
    description,
    googleMapUrl,
    menuUrl,
    // 以下自動帶入
    name: placeData.name,
    formattedAddress: placeData.formatted_address,
    longitude: placeData.geometry?.location?.lng,
    latitude: placeData.geometry?.location?.lat,
    phone: placeData.formatted_phone_number || "",
    photos: placeData.photos ? [{ url: getGooglePhotoUrl(placeData.photos[0].photo_reference) }] : [],
    website: placeData.website || "",
    isActive: true
  };

  try {
    const res = await fetch(`${API_URL}/api/admin/maps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include"
    });
    if (!res.ok) throw new Error("新增失敗");
    alert("新增成功");
    // 清空表單
    document.querySelector(".restaurantType").value = "";
    document.querySelector(".restaurantDescription").value = "";
    document.querySelector(".restaurantGoogleMapUrl").value = "";
    document.querySelector(".restaurantMenuUrl").value = "";
    fetchMapItems();
  } catch (err) {
    alert("新增失敗");
  }
});

// 解析 Google map 連結取得 place_id
function extractPlaceIdFromUrl(url) {
  // 支援 https://www.google.com/maps/place/?q=place_id:xxxx 或 .../place/?q=place_id:xxxx
  const match = url.match(/[?&]q=place_id:([a-zA-Z0-9_-]+)/) || url.match(/\/place\/.*\/data=!3m1!4b1!4m5!3m4!1s([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Google Places API 取得詳細資料
async function fetchGooglePlaceDetails(placeId) {
  const apiKey = window.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&language=zh-TW`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") throw new Error("Google Places API error");
  return data.result;
}

// Google Places API 取得圖片網址
function getGooglePhotoUrl(photoReference) {
  const apiKey = window.GOOGLE_MAPS_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
}

function collectOpeningHours() {
  const rows = openingHoursList.querySelectorAll("tr");
  const hours = [];
  rows.forEach(row => {
    const daySel = row.querySelector(".openingDay");
    const openInput = row.querySelector(".openingTime");
    const closeInput = row.querySelector(".closingTime");
    if (daySel && openInput && closeInput) {
      hours.push({
        day: daySel.value,
        open: openInput.value,
        close: closeInput.value,
        closed: false
      });
    }
  });
  return hours;
}