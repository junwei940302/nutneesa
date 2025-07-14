// admin-history.js
// 歷史紀錄相關功能

async function fetchHistory() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/admin/history`, {
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
    tableBody.innerHTML = "";
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