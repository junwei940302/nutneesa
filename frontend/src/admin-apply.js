// admin-apply.js
// 活動報名審核相關功能

async function fetchEnrollments() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/admin/enrollments`, {
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
    tableBody.innerHTML = "";
    enrollments.forEach((item, index) => {
        const row = document.createElement("tr");
        const submittedDate = new Date(item.submittedAt).toLocaleString("zh-TW");
        const userRole = item.userDepartmentYear && item.userDepartmentYear.includes("電機") ? "member" : "nonMember";
        const paymentAmount = userRole === "member" ? item.memberPrice : item.nonMemberPrice;
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
            <td><button class="view-answers-btn" data-id="${item._id}" data-answers='${JSON.stringify(item.answers)}' data-form-snapshot='${JSON.stringify(item.formSnapshot)}'>查看作答內容</button></td>
            <td>
                <select class="payment-status-select" data-id="${item._id}" style="padding: 2px 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <option value="未付款" ${item.paymentStatus === "未付款" ? "selected" : ""}>未付款</option>
                    <option value="已付款" ${item.paymentStatus === "已付款" ? "selected" : ""}>已付款</option>
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });
    document.querySelectorAll(".payment-status-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const enrollmentId = event.target.dataset.id;
            const paymentStatus = event.target.value;
            updatePaymentStatus(enrollmentId, paymentStatus);
        });
    });
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

function updatePaymentStatus(id, paymentStatus) {
    fetch(`${API_URL}/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentStatus }),
        credentials: "include",
    })
    .then(response => {
        if (!response.ok) throw new Error("Failed to update payment status");
        // 不刷新整個表格，只更新當前選項的狀態
        console.log(`付款狀態已更新為: ${paymentStatus}`);
    })
    .catch(error => {
        console.error("Error updating payment status:", error);
        alert("更新付款狀態失敗");
        fetchEnrollments(); // Refresh to revert changes
    });
}

function showAnswersModal(answers, formSnapshot, enrollment) {
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
    answersHtml += "<hr style='margin: 20px 0; border: 1px solid #eee;'>";
    answersHtml += "<h4>付款方式詳細資訊</h4>";
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
    if (paymentMethod === "轉帳" || paymentMethod.includes("轉帳")) {
        let bankCode = "未填寫";
        let account = "未填寫";
        if (enrollment && enrollment.paymentNotes) {
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
            <button onclick="this.closest('.modal').remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">關閉</button>
        </div>
    `;
    modal.className = "modal";
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
} 