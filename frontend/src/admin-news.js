// admin-news.js
// 控制中心｜Dashboard 相關功能

const NEWS_TYPES = ["重要通知", "系會資訊", "活動快訊", "會員專屬"];

async function fetchNews() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/admin/news`, {
            headers: {
                "Authorization": "Bearer " + idToken,
            },
            credentials: "include",
        });
        if (response.status === 401) {
            await firebase.auth().signOut();
            window.location.href = "login.html";
            return;
        }
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
    tableBody.innerHTML = "";
    news.forEach((item, index) => {
        const row = document.createElement("tr");
        const createDate = new Date(item.createDate).toLocaleString("zh-TW");
        const publishDate = new Date(item.publishDate).toLocaleString("zh-TW");
        let typeOptions = NEWS_TYPES.map(type => `<option value="${type}" ${item.type === type ? "selected" : ""}>${type}</option>`).join("");
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
    document.querySelectorAll(".news-type-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const newsId = event.target.dataset.id;
            const newType = event.target.value;
            updateNewsField(newsId, "type", newType);
        });
    });
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
    const user = await getCurrentUserAsync();
    if (!user) {
        alert("請先登入！");
        return;
    }
    const idToken = await user.getIdToken();
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            headers:{
                "Authorization": "Bearer " + idToken,
            },
            method: "DELETE",
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error("Failed to delete news");
        }
        fetchNews();
    } catch (error) {
        console.error("Error deleting news:", error);
        alert("刪除消息失敗");
    }
}

async function updateNewsVisibility(id, visibility) {
    const user = await getCurrentUserAsync();
    if (!user) {
        alert("請先登入！");
        return;
    }
    const idToken = await user.getIdToken();
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify({ visibility }),
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error("Failed to update visibility");
        }
    } catch (error) {
        console.error("Error updating news visibility:", error);
        fetchNews();
    }
}

async function updateNewsField(newsId, field, value) {
    const user = await getCurrentUserAsync();
    if (!user) {
        alert("請先登入！");
        return;
    }
    const idToken = await user.getIdToken();
    try {
        const body = {};
        body[field] = value;
        const response = await fetch(`${API_URL}/api/admin/news/${newsId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json" ,
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify(body),
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to update news");
        fetchNews();
    } catch (err) {
        alert("更新失敗");
    }
}

async function addNews(newsData) {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/admin/news`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify(newsData),
        });
        if (!response.ok) throw new Error("Failed to add news");
        fetchNews(); // 新增成功後刷新列表
    } catch (err) {
        alert("新增消息失敗");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const addNewsBtn = document.querySelector(".addNews");
    if (addNewsBtn) {
        addNewsBtn.addEventListener("click", async () => {
            const type = document.querySelector(".newsType").value;
            const content = document.getElementById("newsContent").value.trim();
            const publishNow = document.querySelector(".publishNowCheckbox");
            const arrangePublishInput = document.querySelector(".arrangePublish");
            let publishDate = new Date();
            if (!publishNow && arrangePublishInput.value) {
                publishDate = new Date(arrangePublishInput.value);
            }
            if (!content) {
                alert("請輸入消息內容");
                return;
            }
            const newsData = {
                type,
                content,
                publishDate,
                visibility: false, // 預設新增為可見
            };
            await addNews(newsData);
            document.getElementById("newsContent").value = "";
        });
    }
}); 