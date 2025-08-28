import { auth } from './firebaseApp.js';
import { getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const MEMBER_ROLES = ["管理員", "會長", "系學會成員", "本系會員", "非本系會員", "訪客"];
const MEMBER_GENDERS = ["生理男", "生理女", "其他"];
const MEMBER_STATUSES = ["生效中", "待驗證", "未生效", "已撤銷"];

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

async function fetchMembers() {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/members`, {
            headers: { "Authorization": "Bearer " + idToken },
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
    tableBody.innerHTML = "";
    members.forEach((item, index) => {
        const row = document.createElement("tr");
        const roleOptions = MEMBER_ROLES.map(role => `<option value="${role}" ${item.role === role ? "selected" : ""}>${role}</option>`).join("");
        const roleCell = (item.role === "管理員" || item.role === '會長')
            ? `<span>${item.role}</span>`
            : `<select class="member-role-select" data-id="${item._id}">${roleOptions}</select>`;
        const registerDate = item.metadata && item.metadata.creationTime ? new Date(item.metadata.creationTime).toLocaleString("zh-TW") : "N/A";
        const lastOnline = item.metadata && item.metadata.lastSignInTime ? new Date(item.metadata.lastSignInTime).toLocaleString("zh-TW") : "N/A";
        const genderOptions = MEMBER_GENDERS.map(gender => `<option value="${gender}" ${item.gender === gender ? "selected" : ""}>${gender}</option>`).join("");
        const statusOptions = MEMBER_STATUSES.map(status => `<option value="${status}" ${item.isActive === status ? "selected" : ""}>${status}</option>`).join("");

        row.innerHTML = `
            <td data-label="序號">${index + 1}</td>
            <td data-label="會員編號">${item._id}</td>
            <td data-label="身份類別">${roleCell}</td>
            <td data-label="會員名稱"><span class="member-displayname" data-id="${item._id}">${item.displayName}</span> <button class="edit-member-btn" data-field="displayName">修改</button></td>
            <td data-label="會員狀態"><select class="member-status-select" data-id="${item._id}">${statusOptions}</select></td>
            <td data-label="學號"><span class="member-studentid" data-id="${item._id}">${item.studentId}</span> <button class="edit-member-btn" data-field="studentId">修改</button></td>
            <td data-label="性別"><select class="member-gender-select" data-id="${item._id}">${genderOptions}</select></td>
            <td data-label="Email"><span class="member-email" data-id="${item._id}">${item.email}</span></td>
            <td data-label="電話"><span class="member-phonenumber" data-id="${item._id}">${item.phoneNumber}</span> <button class="edit-member-btn" data-field="phoneNumber">修改</button></td>
            <td data-label="系級"><span class="member-departmentyear" data-id="${item._id}">${item.departmentYear}</span> <button class="edit-member-btn" data-field="departmentYear">修改</button></td>
            <td data-label="註冊日期">${registerDate}</td>
            <td data-label="上次上線">${lastOnline}</td>
            <td data-label="累計消費金額"><span class="member-cumulative" data-id="${item._id}">${item.cumulativeConsumption}</span> <button class="edit-member-btn" data-field="cumulativeConsumption">修改</button></td>
            <td data-label="電子郵件驗證"><span>${item.emailVerified ? "已驗證" : "未驗證"}</span></td>
            <td data-label="註銷會員資格"><button class="revoke-member-btn" data-id="${item._id}">註銷</button></td>
        `;
        tableBody.appendChild(row);
    });

    addMemberTableEventListeners();
}

function addMemberTableEventListeners() {
    const tableBody = document.querySelector(".panel[data-members] .members-table-body");
    if (!tableBody) return;

    tableBody.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('revoke-member-btn')) {
            const memberId = target.dataset.id;
            if (confirm("確定要註銷該會員資格嗎？此操作將同時刪除帳號且無法復原。")) {
                deleteMember(memberId);
            }
        } else if (target.classList.contains('edit-member-btn')) {
            const field = target.dataset.field;
            const row = target.closest('tr');
            const memberId = row.querySelector('.revoke-member-btn').dataset.id;
            const span = row.querySelector(`.member-${field}`);

            const oldValue = span ? span.textContent : "";
            const newValue = prompt(`請輸入新的 ${field}`, oldValue);

            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, field, newValue);
            }
        }
    });

    tableBody.addEventListener('change', (event) => {
        const target = event.target;
        if (target.matches('.member-role-select, .member-gender-select, .member-status-select')) {
            const memberId = target.dataset.id;
            const field = target.className.split('-')[1]; // e.g., 'role', 'gender', 'status'
            const value = target.value;
            updateMemberField(memberId, field, value);
        }
    });
}

async function deleteMember(id) {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/members/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + idToken },
        });
        if (!response.ok) throw new Error("Failed to revoke member");
        alert("會員已註銷");
        fetchMembers();
    } catch (err) {
        console.error("Error revoking member:", err);
        alert("註銷失敗，請稍後再試");
    }
}

async function updateMemberField(memberId, field, value) {
    const idToken = await getAuthToken();
    if (!idToken) return;

    try {
        const body = { [field]: value };
        const response = await fetch(`${API_URL}/api/admin/members/${memberId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Failed to update member");
        // To avoid too many alerts, we can remove this or make it a less intrusive notification.
        // alert("修改成功");
        fetchMembers(); // Refresh to show changes and ensure data consistency
    } catch (err) {
        console.error(`Failed to update member ${field}:`, err);
        alert("更新失敗");
    }
}

// Expose the fetchMembers function to the global scope so admin.js can call it.
window.fetchMembers = fetchMembers;

// --- Manual Grade Update ---
document.addEventListener('DOMContentLoaded', () => {
    const updateGradesBtn = document.getElementById('update-all-grades-btn');
    if (updateGradesBtn) {
        updateGradesBtn.addEventListener('click', async () => {
            if (!confirm("確定要為所有成員重新計算年級嗎？此操作可能需要一些時間。")) {
                return;
            }

            const idToken = await getAuthToken();
            if (!idToken) return;

            updateGradesBtn.disabled = true;
            updateGradesBtn.textContent = "更新中...";

            try {
                const response = await fetch(`${API_URL}/api/admin/members/update-grades`, {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + idToken },
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || "Failed to update grades.");
                }

                alert(result.message);
                fetchMembers(); // Refresh the list to show updated grades

            } catch (error) {
                console.error("Error updating grades:", error);
                alert(`年級更新失敗: ${error.message}`);
            } finally {
                updateGradesBtn.disabled = false;
                updateGradesBtn.textContent = "手動更新所有成員年級";
            }
        });
    }
});