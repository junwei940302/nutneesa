// 登入檢查，未登入則導回 login.html
let isUserReady = false;
let currentUser = null;

firebase.auth().onAuthStateChanged(async function(user) {
    if (user) {
      // 已登入，取得 token
      const idToken = await user.getIdToken();
      fetch(`${API_URL}/api/me`, {headers: { Authorization: 'Bearer ' + idToken }})
        .then(res => res.json())
        .then(data => {
            if (!data.loggedIn) {
                window.location.href = "login.html";
                return;
            }
            // data.user 裡有 name, email, role
            const identityPanel = document.querySelector(".identityPanel");
            identityPanel.innerHTML = `<p>當前登入身份：${data.user.role} ${data.user.displayName}</p>`;
            identityPanel.classList.remove("unauthorize");
            identityPanel.classList.add("authorized");
            isUserReady = true;
            currentUser = user;
            showPanel(funcPicker.value);
        });
    }
    // else: 未登入，不做事，留在登入頁
  });

// ===== 入口：功能模組引用 =====
// （已由 <script> 引入，不需 import）

// ===== 2. 介面控制 UI Control =====
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

// 監聽選擇變更
funcPicker.addEventListener("change", function() {
    if (isUserReady) {
        showPanel(this.value);
    } else {
        alert("請先登入！");
    }
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

// 其餘事件綁定與初始化流程，請呼叫對應模組的 function

// 表單建立按鈕
const createFormBtn = document.getElementById("createFormBtn");
if (createFormBtn) {
    createFormBtn.addEventListener("click", function() {
        window.open("buildForms.html", "_blank");
    });
}

const logoutBtn = document.querySelector(".logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
        firebase.auth().signOut().then(() => {
            window.location.href = "login.html";
        });
    });
}