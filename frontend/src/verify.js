// 取得網址參數
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

const email = getQueryParam('email');
const code = getQueryParam('code');

const h3 = document.querySelector('h3');
const verifiedDiv = document.querySelector('.verified');
const countdownSpan = verifiedDiv.querySelector('span');

function startCountdown() {
  let timeLeft = 5;
  countdownSpan.textContent = timeLeft;
  const timer = setInterval(() => {
    timeLeft--;
    countdownSpan.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      window.location.href = 'login.html';
    }
  }, 1000);
}

if (email && code) {
  fetch(`https://nutneesa.online/verify?email=${encodeURIComponent(email)}&code=${code}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // 驗證成功
        h3.textContent = '您已完成驗證';
        verifiedDiv.hidden = false;
        startCountdown();
        // 你可以根據需要自動導向或顯示倒數
      } else {
        // 驗證失敗
        h3.textContent = '驗證失敗，請檢查連結或聯絡管理員';
      }
    })
    .catch(() => {
      h3.textContent = '驗證時發生錯誤，請稍後再試';
    });
} else {
  h3.textContent = '缺少驗證資訊';
  startCountdown();
}