// admin-utils.js
// 全域工具/輔助函式

// 修正 datetime-local 的時區問題
function localDatetimeToISOString(localStr) {
    if (!localStr) return undefined;
    const [date, time] = localStr.split("T");
    const [year, month, day] = date.split("-");
    const [hour, minute] = time.split(":");
    const d = new Date(year, month - 1, day, hour, minute);
    return d.toISOString();
}

function getCurrentUserAsync() {
    return new Promise(resolve => {
      const unsubscribe = firebase.auth().onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      });
    });
}

async function loginMemberSwitcher(){
    const user = await getCurrentUserAsync();
    if (!user) {
        // 沒登入，直接顯示登入按鈕、隱藏會員按鈕
        document.querySelectorAll('.loginBtnSwitcher, .memberBtnSwitcher').forEach((element) => {
            if (element.classList.contains('loginBtnSwitcher')) {
                element.style.display = '';
            } else if (element.classList.contains('memberBtnSwitcher')) {
                element.style.display = 'none';
            }
        });
        return;
    }
    await user.reload();
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_URL}/api/me`, {
        headers: { 
          'Authorization': 'Bearer ' + idToken ,
        }
    });
    const data = await res.json();
    document.querySelectorAll('.loginBtnSwitcher, .memberBtnSwitcher').forEach((element) => {
        if (data.loggedIn) {
            if (element.classList.contains('loginBtnSwitcher')) {
                element.style.display = 'none';
            } else if (element.classList.contains('memberBtnSwitcher')) {
                element.style.display = '';
                //element.querySelector('a').textContent = data.user.departmentYear + ' ' + data.user.displayName;
            }
        } else {
            if (element.classList.contains('loginBtnSwitcher')) {
                element.style.display = '';
            } else if (element.classList.contains('memberBtnSwitcher')) {
                element.style.display = 'none';
            }
        }
    });
}

/**
 * 动态加载 HTML 片段到指定容器
 * Dynamically load an HTML fragment into a container
 * @param {string} url - HTML file path
 * @param {string} selector - Container selector
 */
function loadHtmlFragment(url, selector, callback) {
  fetch(url)
    .then(response => response.text())
    .then(html => {
      document.querySelector(selector).innerHTML = html;
      if (callback) callback();
  });
  loginMemberSwitcher();
}