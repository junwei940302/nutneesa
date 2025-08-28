import { auth } from './firebaseApp.js';
import { getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const NEWS_TYPES = ["重要通知", "系會資訊", "活動快訊", "會員專屬"];

// Helper to get the current user's ID token
async function getAuthToken() {
    if (!auth.currentUser) {
        alert("請先登入！");
        window.location.href = "login.html";
        return null;
    }
    await auth.currentUser.reload();
    return await getIdToken(auth.currentUser);
}

async function fetchNews() {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/news`, {
            headers: { "Authorization": "Bearer " + idToken },
        });
        if (!response.ok) throw new Error("Failed to fetch news");
        const news = await response.json();
        populateNewsTable(news);
    } catch (error) {
        console.error("Failed to fetch news:", error);
    }
}

function populateNewsTable(news) {
    // IMPORTANT: Select from the new data-news panel
    const tableBody = document.querySelector(".panel[data-news] .news-table-body");
    if (!tableBody) {
        console.error("News table body not found in data-news panel");
        return;
    }
    tableBody.innerHTML = "";
    news.forEach((item, index) => {
        const row = document.createElement("tr");
        const createDate = new Date(item.createDate).toLocaleString("zh-TW");
        const publishDate = new Date(item.publishDate).toLocaleString("zh-TW");
        const typeOptions = NEWS_TYPES.map(type => `<option value="${type}" ${item.type === type ? "selected" : ""}>${type}</option>`).join("");

        row.innerHTML = `
            <td data-label="可見"><input type="checkbox" class="visibility-checkbox" data-id="${item._id}" ${item.visibility ? "checked" : ""}></td>
            <td data-label="序號">${index + 1}</td>
            <td data-label="消息類型"><select class="news-type-select" data-id="${item._id}">${typeOptions}</select></td>
            <td data-label="消息內容"><span class="news-content" data-id="${item._id}">${item.content}</span> <button class="edit-news-content-btn" data-id="${item._id}">修改</button></td>
            <td data-label="創建日期">${createDate}</td>
            <td data-label="發布日期">${publishDate}</td>
            <td data-label="經手人">${item.publisher}</td>
            <td data-label="刪除"><button class="delete-news-btn" data-id="${item._id}">刪除</button></td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners after populating the table
    addTableEventListeners();
}

function addTableEventListeners() {
    document.querySelectorAll(".visibility-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const newsId = event.target.dataset.id;
            const isVisible = event.target.checked;
            updateNewsField(newsId, 'visibility', isVisible);
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
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + idToken },
        });
        if (!response.ok) throw new Error("Failed to delete news");
        fetchNews();
    } catch (error) {
        console.error("Error deleting news:", error);
        alert("刪除消息失敗");
    }
}

async function updateNewsField(id, field, value) {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const body = { [field]: value };
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Failed to update news field");
        // No need to call fetchNews() here, as the change is minor and reflected visually.
        // If we want a full refresh, we can add it back.
    } catch (error) {
        console.error(`Error updating news ${field}:`, error);
        alert("更新失敗");
        fetchNews(); // Refresh on error to revert optimistic UI
    }
}

async function addNews(newsData) {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/news`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify(newsData),
        });
        if (!response.ok) throw new Error("Failed to add news");
        fetchNews();
    } catch (err) {
        console.error("Error adding news:", err);
        alert("新增消息失敗");
    }
}

// Event listener for the "Add News" button
const addNewsBtn = document.querySelector(".addNews");
if (addNewsBtn) {
    addNewsBtn.addEventListener("click", async () => {
        const type = document.querySelector(".newsType").value;
        const content = document.getElementById("newsContent").value.trim();
        const publishNow = document.querySelector(".publishNowCheckbox").checked;

        if (!content) {
            alert("請輸入消息內容");
            return;
        }

        const newsData = {
            type,
            content,
            publishDate: new Date(), // publishDate is now handled by the backend logic
            visibility: publishNow, // Visibility is controlled by the checkbox
        };
        await addNews(newsData);
        document.getElementById("newsContent").value = "";
    });
}

// Expose the fetchNews function to the global scope so admin.js can call it.
window.fetchNews = fetchNews;