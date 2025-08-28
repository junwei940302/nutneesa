import { auth } from './firebaseApp.js';
import { getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

async function getAuthToken() {
    if (!auth.currentUser) {
        alert("請先登入！");
        window.location.href = "login.html";
        return null;
    }
    await auth.currentUser.reload();
    return await getIdToken(auth.currentUser);
}

async function fetchEnrollments() {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/enrollments`, {
            headers: { "Authorization": "Bearer " + idToken },
        });
        if (!response.ok) throw new Error("Network response was not ok");
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
        const userRole = item.userDepartmentYear && item.userDepartmentYear.includes("電機") ? "member" : "nonMember";
        const paymentAmount = userRole === "member" ? item.memberPrice : item.nonMemberPrice;
        const paymentMethod = item.paymentMethod || (item.answers && (item.answers["paymentMethod"] || item.answers["payments"])) || "未選擇";

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.userName}</td>
            <td>${item.userDepartmentYear}</td>
            <td>${item.eventTitle}</td>
            <td>NT$ ${paymentAmount}</td>
            <td>${paymentMethod}</td>
            <td><button class="view-answers-btn" data-id="${item._id}">查看作答內容</button></td>
            <td>
                <select class="payment-status-select" data-id="${item._id}">
                    <option value="未付款" ${item.paymentStatus === "未付款" ? "selected" : ""}>未付款</option>
                    <option value="轉帳待確認" ${item.paymentStatus === "轉帳待確認" ? "selected" : ""}>轉帳待確認</option>
                    <option value="待現場付款" ${item.paymentStatus === "待現場付款" ? "selected" : ""}>待現場付款</option>
                    <option value="已付款" ${item.paymentStatus === "已付款" ? "selected" : ""}>已付款</option>
                    <option value="已退款" ${item.paymentStatus === "已退款" ? "selected" : ""}>已退款</option>
                </select>
            </td>
        `;
        // Store data on the row element itself to avoid parsing JSON from attributes
        row.dataset.enrollment = JSON.stringify(item);
        tableBody.appendChild(row);
    });
}

// Use a single event listener on the table body for efficiency
document.querySelector(".event-registration-table-body")?.addEventListener('change', (event) => {
    if (event.target.classList.contains('payment-status-select')) {
        const enrollmentId = event.target.dataset.id;
        const paymentStatus = event.target.value;
        updatePaymentStatus(enrollmentId, paymentStatus);
    }
});

document.querySelector(".event-registration-table-body")?.addEventListener('click', (event) => {
    if (event.target.classList.contains('view-answers-btn')) {
        const rowData = event.target.closest('tr').dataset.enrollment;
        if(rowData) {
            const enrollment = JSON.parse(rowData);
            showAnswersModal(enrollment);
        }
    }
});


async function updatePaymentStatus(id, paymentStatus) {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/enrollments/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify({ paymentStatus }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update payment status");
        }
        // Optional: show a less intrusive success message
    } catch (error) {
        console.error("Error updating payment status:", error);
        alert(`更新付款狀態失敗: ${error.message}`);
        fetchEnrollments(); // Refresh to revert changes
    }
}

function showAnswersModal(enrollment) {
    // ... (Modal logic remains the same, but now receives the whole enrollment object)
    const { answers, formSnapshot } = enrollment;
    // ... rest of the function
}


window.fetchEnrollments = fetchEnrollments;