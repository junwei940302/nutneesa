// admin-events.js
// 活動管理相關功能

const EVENT_HASHTAGS = ["#賽事", "#聯合", "#實習"];
const EVENT_STATUS = ["尚未開始", "開放報名", "即將開始", "活動結束"];

async function fetchEvents() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/admin/events`, {
            credentials: "include",
            headers: {
                "Authorization": "Bearer " + idToken,
            },
        });
        if (response.status === 401) {
            await firebase.auth().signOut();
            window.location.href = "login.html";
            return;
        }
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const events = await response.json();
        populateEventsTable(events);
    } catch (error) {
        console.error("Failed to fetch events:", error);
    }
}

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
        const previewContent = (item.content || "").length > 10 ? (item.content.slice(0, 10) + "...") : (item.content || "");
        row.innerHTML = `
            <td>
              <button class="toggle-content-btn" data-id="${item._id}" style="background:none;border:none;cursor:pointer;">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
              <input type="checkbox" class="event-visibility-checkbox" data-id="${item._id}" ${item.visibility ? "checked" : ""}>
            </td>
            <td>
              <img src="${item.imgUrl}" class="event-thumb" data-id="${item._id}" style="width:40px;height:40px;object-fit:cover;cursor:pointer;" alt="event image">
              <button class="edit-event-imgurl-btn" data-id="${item._id}">修改</button>
            </td>
            <td><span class="event-title" data-id="${item._id}">${item.title || ""}</span> <button class="edit-event-title-btn" data-id="${item._id}">修改</button></td>
            <td><select class="event-hashtag-select" data-id="${item._id}">${hashtagOptions}</select></td>
            <td><select class="event-status-select" data-id="${item._id}">${statusOptions}</select></td>
            <td>
              <span class="event-content" data-id="${item._id}" data-content="${encodeURIComponent(item.content || "")}">
                ${previewContent}
              </span>
              <button class="edit-event-content-btn" data-id="${item._id}">修改</button>
            </td>
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
    // 編輯圖片連結
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
    // 編輯標題
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
    // 編輯內容
    document.querySelectorAll(".edit-event-content-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-content[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新內容", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "content", newValue);
            }
        });
    });
    // 編輯非會員價格
    document.querySelectorAll(".edit-event-nonmemberprice-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-nonmemberprice[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "0";
            const newValue = prompt("請輸入新的非會員價格", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "nonMemberPrice", Number(newValue));
            }
        });
    });
    // 編輯會員價格
    document.querySelectorAll(".edit-event-memberprice-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-memberprice[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "0";
            const newValue = prompt("請輸入新的會員價格", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "memberPrice", Number(newValue));
            }
        });
    });
    // 編輯地點
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
    // 編輯系所限制
    document.querySelectorAll(".edit-event-restrictdepartment-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-restrictdepartment[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新系所限制（可留空）", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "restrictDepartment", newValue);
            }
        });
    });
    // 編輯年級限制
    document.querySelectorAll(".edit-event-restrictyear-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-restrictyear[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新年級限制（可留空）", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "restrictYear", newValue);
            }
        });
    });
    // 編輯人數限制
    document.querySelectorAll(".edit-event-restrictquantity-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            const span = document.querySelector(`.event-restrictquantity[data-id="${eventId}"]`);
            const oldValue = span ? span.textContent : "0";
            const newValue = prompt("請輸入新人數上限（0 表示無限制）", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateEventField(eventId, "restrictQuantity", Number(newValue));
            }
        });
    });
    // hashtag select
    document.querySelectorAll(".event-hashtag-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "hashtag", newValue);
        });
    });
    // status select
    document.querySelectorAll(".event-status-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "status", newValue);
        });
    });
    // 活動日期
    document.querySelectorAll(".event-date-input").forEach(input => {
        input.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "eventDate", newValue);
        });
    });
    // 報名開始
    document.querySelectorAll(".event-startenroll-input").forEach(input => {
        input.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "startEnrollDate", newValue);
        });
    });
    // 報名截止
    document.querySelectorAll(".event-endenroll-input").forEach(input => {
        input.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.value;
            updateEventField(eventId, "endEnrollDate", newValue);
        });
    });
    // 限會員 checkbox
    document.querySelectorAll(".event-restrictmember-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.checked;
            updateEventField(eventId, "restrictMember", newValue);
        });
    });
    // 可見性 checkbox
    document.querySelectorAll(".event-visibility-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const eventId = event.target.dataset.id;
            const newValue = event.target.checked;
            updateEventField(eventId, "visibility", newValue);
        });
    });
    // 刪除按鈕
    document.querySelectorAll(".delete-event-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = event.target.dataset.id;
            if (confirm("確定要刪除此活動嗎？")) {
                deleteEvent(eventId);
            }
        });
    });
    // 展開/收合內容
    document.querySelectorAll(".toggle-content-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const eventId = btn.dataset.id;
            const span = document.querySelector(`.event-content[data-id="${eventId}"]`);
            const icon = btn.querySelector("i");
            const fullContent = decodeURIComponent(span.getAttribute("data-content") || "");
            const previewContent = fullContent.length > 10 ? (fullContent.slice(0, 10) + "...") : fullContent;
            if (btn.classList.contains("expanded")) {
                // 收合
                span.textContent = previewContent;
                btn.classList.remove("expanded");
                icon.classList.remove("fa-chevron-down");
                icon.classList.add("fa-chevron-right");
            } else {
                // 展開
                span.textContent = fullContent;
                btn.classList.add("expanded");
                icon.classList.remove("fa-chevron-right");
                icon.classList.add("fa-chevron-down");
            }
        });
    });
    // 小圖點擊預覽大圖（可選）
    document.querySelectorAll(".event-thumb").forEach(img => {
        img.addEventListener("click", (event) => {
            window.open(event.target.src, "_blank");
        });
    });
}

async function updateEventField(eventId, field, value) {
    if (!field || typeof value === "undefined") {
        alert("更新欄位或值無效");
        return;
    }
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const body = {};
        body[field] = value;
        const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify(body),
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to update event");
        fetchEvents();
    } catch (err) {
        alert("更新失敗");
    }
}

async function deleteEvent(eventId) {
    const user = await getCurrentUserAsync();
    if (!user) {
        alert("請先登入！");
        return;
    }
    await user.reload();
    const idToken = await user.getIdToken();
    try {
        const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + idToken,
            },
            credentials: "include",
        });
        if (!response.ok) throw new Error("刪除活動失敗");
        alert("活動已刪除");
        fetchEvents();
    } catch (err) {
        alert("刪除活動失敗");
    }
}

function addEvent() {
    // 收集表單欄位資料
    const eventData = getPreviewEventData();
    // 檢查必填欄位
    if (!eventData.title || !eventData.content || !eventData.eventDate || !eventData.startEnrollDate || !eventData.endEnrollDate || !eventData.location) {
        alert("請填寫所有必填欄位");
        return;
    }
    // 送出 API 請求
    getCurrentUserAsync().then(async user => {
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        try {
            const response = await fetch(`${API_URL}/api/admin/events`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + idToken,
                },
                body: JSON.stringify(eventData),
                credentials: "include",
            });
            if (!response.ok) throw new Error("新增活動失敗");
            alert("活動新增成功！");
            // 清空表單
            [
                '.eventImgUrl', '.eventTitle', '.eventHashtag', '.eventStatus', '.eventContent',
                '.eventNonMemberPrice', '.eventMemberPrice', '.eventDate', '.startEnrollDate', '.endEnrollDate',
                '.location', '.restrictDepartment', '.restrictYear', '.restrictMember', '.restrictQuantity'
            ].forEach(selector => {
                const el = document.querySelector(selector);
                if (!el) return;
                if (el.type === 'checkbox') el.checked = false;
                else if (el.tagName === 'SELECT') el.selectedIndex = 0;
                else el.value = '';
            });
            renderEventPreview();
            fetchEvents();
        } catch (err) {
            alert("新增活動失敗");
        }
    });
}

// 即時活動預覽功能
function getPreviewEventData() {
    return {
        imgUrl: document.querySelector('.eventImgUrl')?.value || '',
        title: document.querySelector('.eventTitle')?.value || '',
        hashtag: document.querySelector('.eventHashtag')?.value || '',
        status: document.querySelector('.eventStatus')?.value || '',
        content: document.querySelector('.eventContent')?.value || '',
        nonMemberPrice: Number(document.querySelector('.eventNonMemberPrice')?.value) || 0,
        memberPrice: Number(document.querySelector('.eventMemberPrice')?.value) || 0,
        eventDate: document.querySelector('.eventDate')?.value || '',
        startEnrollDate: document.querySelector('.startEnrollDate')?.value || '',
        endEnrollDate: document.querySelector('.endEnrollDate')?.value || '',
        location: document.querySelector('.location')?.value || '',
        restrictDepartment: document.querySelector('.restrictDepartment')?.value || '',
        restrictYear: document.querySelector('.restrictYear')?.value || '',
        restrictMember: document.querySelector('.restrictMember')?.checked || false,
        restrictQuantity: Number(document.querySelector('.restrictQuantity')?.value) || 0,
        enrollQuantity: 0 // 預覽時無報名人數
    };
}

function renderEventPreview() {
    const event = getPreviewEventData();
    let hashtags = '';
    hashtags += `<p class="hashtag event">${event.hashtag || ''}</p>`;
    if (event.status) {
        hashtags += `<p class="hashtag status">${event.status}</p>`;
    }
    if (event.restrictQuantity === 0) {
        hashtags += `<p class="hashtag event">人數無上限</p>`;
    } else if (event.restrictQuantity > 0) {
        hashtags += `<p class="hashtag event">${event.enrollQuantity || 0}/${event.restrictQuantity}</p>`;
    }
    if (event.restrictDepartment) hashtags += `<p class="hashtag event">系別限制</p>`;
    if (event.restrictYear) hashtags += `<p class="hashtag event">年級限制</p>`;
    if (event.restrictMember) hashtags += `<p class="hashtag event">會員專屬</p>`;
    // 價格顯示
    let priceText = '';
    if (event.memberPrice === 0 && event.nonMemberPrice === 0) {
        priceText = '免費參與';
    } else if (event.memberPrice === event.nonMemberPrice) {
        priceText = `新台幣 ${event.memberPrice} 元整`;
    } else {
        priceText = `新台幣 ${event.memberPrice} 元整（會員） / ${event.nonMemberPrice} 元（非會員）`;
    }
    const html = `
        <div class="infoCard" data-enroll>
            <div class="activitySearcher"></div>
            <div class="activityPanels">
                <div class="activityItem">
                    <img src="${event.imgUrl}" title="活動插圖" onerror="this.src='./assets/images/White-noise.gif'">
                    <div class="textZone">
                        <h2>${event.title || ''}</h2>
                        <div class="activityHashtag">${hashtags}</div>
                        <div class="activityContent">
                            <p>${event.content || ''}</p>
                            <div class="activityPrice">
                                <h3>${priceText}</h3>
                            </div>
                            <div class="btnZone">
                                <button class="readMore" disabled>詳細資料</button>
                                <button class="enrollBtn" disabled>報名</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.querySelector('.event-preview').innerHTML = html;
}

// 預覽功能初始化包在 DOMContentLoaded 事件內

document.addEventListener('DOMContentLoaded', function() {
    // 綁定所有表單欄位監聽
    [...document.querySelectorAll('.eventImgUrl, .eventTitle, .eventHashtag, .eventStatus, .eventContent, .eventNonMemberPrice, .eventMemberPrice, .eventDate, .startEnrollDate, .endEnrollDate, .location, .restrictDepartment, .restrictYear, .restrictMember, .restrictQuantity')].forEach(el => {
        el.addEventListener('input', renderEventPreview);
        el.addEventListener('change', renderEventPreview);
    });
    // 頁面載入時預覽一次
    renderEventPreview();
    const addEventBtn = document.querySelector('.addEvent');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', addEvent);
    }
}); 