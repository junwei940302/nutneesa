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