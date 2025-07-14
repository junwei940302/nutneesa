// admin-forms.js
// 表單管理相關功能

async function fetchForms() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/admin/forms`, {
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
            window.open(`buildForms.html?formId=${formId}`, '_blank');
        });
    });
}

function deleteForm(formId) {
    fetch(`${API_URL}/api/admin/forms/${formId}`, {
        method: "DELETE",
        credentials: "include",
    })
    .then(response => {
        if (response.status === 404) {
            alert("表單已不存在，畫面將自動刷新");
            fetchForms();
            return;
        }
        if (!response.ok) throw new Error("Failed to delete form");
        alert("表單已刪除");
        fetchForms();
    })
    .catch(error => {
        alert("刪除表單失敗，請稍後再試");
    });
} 