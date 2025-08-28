import { auth } from './firebaseApp.js';
import { onAuthStateChanged, getIdToken, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// These functions are defined in other admin-*.js scripts, which are now loaded as modules.
// This script relies on them being available in the global scope.
// A better long-term solution is to have them export functions and import them here.
declare const fetchNews: () => Promise<void>;
declare const fetchMembers: () => Promise<void>;
declare const fetchHistory: () => Promise<void>;
declare const fetchEvents: () => Promise<void>;
declare const fetchForms: () => Promise<void>;
declare const fetchEnrollments: () => Promise<void>;
declare const fetchMapItems: () => Promise<void>;
declare const initConferenceRecords: () => void;
declare const initIndexPanel: () => void;
declare const initDashboardPanel: () => void;
declare const detachDashboardListeners: () => void;
declare const showLoading: () => void;
declare const hideLoading: () => void;


let isUserReady = false;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const idToken = await getIdToken(user);
        try {
            const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${idToken}` } });
            const data = await res.json();

            if (!data.loggedIn || !(data.user.role.includes('admin') || data.user.role.includes('會長'))) {
                alert('權限不足，您必須是管理員才能訪問此頁面。');
                window.location.href = "login.html";
                return;
            }

            const identityPanel = document.querySelector(".identityPanel");
            identityPanel.innerHTML = `<p>當前登入身份：${data.user.role} ${data.user.displayName}</p>`;
            identityPanel.classList.remove("unauthorize");
            identityPanel.classList.add("authorized");

            isUserReady = true;
            showPanel(funcPicker.value);

        } catch (error) {
            console.error("Authentication check failed", error);
            window.location.href = "login.html";
        }
    } else {
        window.location.href = "login.html";
    }
});

const funcPicker = document.querySelector(".funcPicker");
const panels = {
    "控制中心｜Dashboard": document.querySelector(".panel[data-dashboard]"),
    "主要頁面｜Index": document.querySelector(".panel[data-index]"),
    "最新消息｜News": document.querySelector(".panel[data-news]"),
    "歷史紀錄｜History": document.querySelector(".panel[data-history]"),
    "會員管理｜Members": document.querySelector(".panel[data-members]"),
    "活動管理｜Events": document.querySelector(".panel[data-events]"),
    "表單管理｜Forms": document.querySelector(".panel[data-forms]"),
    "金流管理｜Flow": document.querySelector(".panel[data-flow]"),
    "資源申請｜Apply": document.querySelector(".panel[data-apply]"),
    "美食地圖｜Maps": document.querySelector(".panel[data-maps]"),
    "會議記錄｜Conference": document.querySelector(".panel[data-conference]"),
    "偏好設定｜Settings": document.querySelector(".panel[data-settings]"),
};

function showPanel(selected) {
    if (!isUserReady) {
        return;
    }
    showLoading();

    Object.values(panels).forEach(panel => {
        if(panel) panel.style.display = "none";
    });

    const panelToShow = Object.entries(panels).find(([key]) => key === selected)?.[1];
    if (panelToShow) {
        panelToShow.style.display = "";
    }

    const loadAction = {
        "主要頁面｜Index": initIndexPanel,
        "最新消息｜News": fetchNews,
        "會員管理｜Members": fetchMembers,
        "歷史紀錄｜History": fetchHistory,
        "活動管理｜Events": fetchEvents,
        "表單管理｜Forms": fetchForms,
        "資源申請｜Apply": fetchEnrollments,
        "美食地圖｜Maps": fetchMapItems,
        "會議記錄｜Conference": initConferenceRecords,
    }[selected];

    // Detach dashboard listeners if we are navigating away from it.
    if (selected !== "控制中心｜Dashboard") {
        detachDashboardListeners();
    }

    if (loadAction) {
        Promise.resolve(loadAction()).finally(hideLoading);
    } else {
        // Handle panels that don't have a specific load action, like the main dashboard
        if (selected === "控制中心｜Dashboard") {
            initDashboardPanel();
        }
        hideLoading();
    }
}

funcPicker.addEventListener("change", function() {
    showPanel(this.value);
});

const createFormBtn = document.getElementById("createFormBtn");
if (createFormBtn) {
    createFormBtn.addEventListener("click", () => window.open("buildForms.html", "_blank"));
}

const logoutBtn = document.querySelector(".logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    });
}