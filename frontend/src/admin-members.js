// admin-members.js
// 會員管理相關功能

const MEMBER_ROLES = ["管理員", "系學會成員", "本系會員", "非本系會員", "訪客"];
const MEMBER_GENDERS = ["生理男", "生理女", "其他"];

async function fetchMembers() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert("請先登入！");
            return;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/admin/members`,{
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
        const roleCell = item.role === "管理員"
            ? `<span>${item.role}</span>`
            : `<select class="member-role-select" data-id="${item._id}">${roleOptions}</select>`;
        const registerDate = item.metadata && item.metadata.creationTime ? new Date(item.metadata.creationTime).toLocaleString("zh-TW") : "";
        const lastOnline = item.metadata && item.metadata.lastSignInTime ? new Date(item.metadata.lastSignInTime).toLocaleString("zh-TW") : "";
        let genderOptions = MEMBER_GENDERS.map(gender => `<option value="${gender}" ${item.gender === gender ? "selected" : ""}>${gender}</option>`).join("");
        const statusOptions = ["生效中", "待驗證", "未生效", "已撤銷"].map(status => `<option value="${status}" ${item.isActive === status ? "selected" : ""}>${status}</option>`).join("");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item._id}</td>
            <td>${roleCell}</td>
            <td><span class="member-displayname" data-id="${item._id}">${item.displayName}</span> <button class="edit-member-displayname-btn" data-id="${item._id}">修改</button></td>
            <td><select class="member-status-select" data-id="${item._id}">${statusOptions}</select></td>
            <td><span class="member-studentid" data-id="${item._id}">${item.studentId}</span> <button class="edit-member-studentid-btn" data-id="${item._id}">修改</button></td>
            <td><select class="member-gender-select" data-id="${item._id}">${genderOptions}</select></td>
            <td><span class="member-email" data-id="${item._id}">${item.email}</span></td>
            <td><span class="member-phonenumber" data-id="${item._id}">${item.phoneNumber}</span> <button class="edit-member-phonenumber-btn" data-id="${item._id}">修改</button></td>
            <td><span class="member-departmentyear" data-id="${item._id}">${item.departmentYear}</span> <button class="edit-member-departmentyear-btn" data-id="${item._id}">修改</button></td>
            <td>${registerDate}</td>
            <td>${lastOnline}</td>
            <td><span class="member-cumulative" data-id="${item._id}">${item.cumulativeConsumption}</span> <button class="edit-member-cumulative-btn" data-id="${item._id}">修改</button></td>
            <td><span>${item.emailVerified? "已驗證":"未驗證"}</span></td>
            <td>
                <button class="revoke-member-btn" data-id="${item._id}">註銷</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    // 註銷功能
    document.querySelectorAll(".revoke-member-btn").forEach(button => {
        button.addEventListener("click", async (event) => {
            const memberId = event.target.dataset.id;
            if (confirm("確定要註銷該會員資格嗎？")) {
                button.disabled = true;
                try {
                    const response = await fetch(`${API_URL}/api/admin/members/${memberId}`, {
                        method: "DELETE",
                        credentials :"include"
                    });
                    if (response.status === 404) {
                        alert("會員已不存在，畫面將自動刷新");
                        fetchMembers();
                        return;
                    }
                    if (!response.ok) throw new Error("Failed to revoke member");
                    alert("會員已註銷");
                    fetchMembers();
                } catch (err) {
                    alert("註銷失敗，請稍後再試");
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
    document.querySelectorAll(".edit-member-displayname-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-displayname[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新名稱", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "displayName", newValue);
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
    // 電話
    document.querySelectorAll(".edit-member-phonenumber-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            const memberId = event.target.dataset.id;
            const span = document.querySelector(`.member-phonenumber[data-id="${memberId}"]`);
            const oldValue = span ? span.textContent : "";
            const newValue = prompt("請輸入新電話", oldValue);
            if (newValue !== null && newValue !== oldValue) {
                updateMemberField(memberId, "phoneNumber", newValue);
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
    // 已驗證 checkbox → emailVerified
    document.querySelectorAll(".member-emailverified-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const memberId = event.target.dataset.id;
            const newValue = event.target.checked;
            updateMemberField(memberId, "emailVerified", newValue);
        });
    });
    // 會員狀態 select
    document.querySelectorAll(".member-status-select").forEach(select => {
        select.addEventListener("change", (event) => {
            const memberId = event.target.dataset.id;
            const newStatus = event.target.value;
            updateMemberField(memberId, "isActive", newStatus);
        });
    });
}

async function updateMemberField(memberId, field, value) {
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
        const response = await fetch(`${API_URL}/api/admin/members/${memberId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json" ,
                "Authorization": "Bearer " + idToken,
            },
            body: JSON.stringify(body),
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to update member");
        alert("修改成功");
        fetchMembers();
    } catch (err) {
        alert("更新失敗");
    }
} 