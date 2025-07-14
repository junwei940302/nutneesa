// 頁面加載完成後的初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM loaded, initializing payments page');
  
  // 檢查是否有 eventId 參數
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('eventId');
  
  if (!eventId) {
    alert('未經授權的訪問');
    window.location.href = 'services.html';
    return;
  }

  try {
    // 取得活動資料
    const eventRes = await fetch(`${API_URL}/api/events`);
    const events = await eventRes.json();
    const event = events.find(e => e._id === eventId);
    
    if (!event) {
      alert('找不到對應的活動');
      window.location.href = 'services.html';
      return;
    }

    // 取得用戶狀態
    let userStatus = null;
    try {
      // 取得 Firebase 使用者 token
      const user = await getCurrentUserAsync();
      const idToken = await user.getIdToken();
      const meRes = await fetch(`${API_URL}/api/me`, {
        headers: { 
          'Authorization': 'Bearer ' + idToken ,
        }
      });
      const meData = await meRes.json();
      if (meData.loggedIn && meData.user) {
        userStatus = meData.user.isActive;
      }
    } catch (error) {
      console.log('無法取得用戶狀態，使用非會員價格');
    }

    // 根據用戶狀態決定價格
    const price = (userStatus === '生效中') ? event.memberPrice : event.nonMemberPrice;
    const isMemberDiscount = (userStatus === '生效中');
    
    // 更新表格內容
    const table = document.querySelector('.panel.info table tbody');
    if (table) {
      const rows = table.querySelectorAll('tr');
      if (rows.length >= 2) {
        rows[0].querySelector('td:nth-child(2)').textContent = event.title;
        const priceText = isMemberDiscount ? `NT$ ${price}（已套用會員優惠）` : `NT$ ${price}`;
        rows[1].querySelector('td:nth-child(2)').textContent = priceText;
      }
    }

  } catch (error) {
    console.error('Error loading event data:', error);
    alert('載入活動資料時發生錯誤');
    window.location.href = 'services.html';
    return;
  }

  // 處理支付方式選擇
  const paymentSelect = document.querySelector('.payments');
  
  // 設置默認顯示現金支付面板
  document.querySelector('.panel.cash').hidden = false;
  document.querySelector('.panel.transfer').hidden = true;
  
  paymentSelect.addEventListener('change', function() {
    const selectedValue = this.value;
    console.log('Payment method changed to:', selectedValue);

    // 顯示選中的面板
    if (selectedValue === '現金支付') {
      document.querySelector('.panel.cash').hidden = false;
      document.querySelector('.panel.transfer').hidden = true;

    } else if (selectedValue === '轉帳') {
      document.querySelector('.panel.cash').hidden = true;
      document.querySelector('.panel.transfer').hidden = false;
    }
  });

  // 處理報名成功按鈕
  const enrollSuccessButtons = document.querySelectorAll('.enrollSuccess');
  enrollSuccessButtons.forEach(button => {
    button.addEventListener('click', async function() {
      try {
        // 判斷是哪一種支付方式
        const paymentSelect = document.querySelector('.payments');
        const selectedMethod = paymentSelect.value;

        let paymentMethod = "";
        let paymentNotes = null;

        if (selectedMethod === "現金支付") {
          paymentMethod = "現金支付";
          paymentNotes = null; // 不需額外資料
        } else if (selectedMethod === "轉帳") {
          paymentMethod = "轉帳";
          // 取得銀行代碼、名稱與帳號
          const bankCodeSelect = document.querySelector('.bankCode');
          const bankCode = bankCodeSelect.value;
          const account = document.querySelector('.account').value.trim();
          let bankName = '';
          if (bankCodeSelect.selectedIndex > 0) {
            // 取得 option 文字並去除前面的代碼
            const optionText = bankCodeSelect.options[bankCodeSelect.selectedIndex].text;
            // 例如 "700｜中華郵政"，分割取名稱
            const match = optionText.match(/\d+｜(.+)/);
            bankName = match ? match[1].trim() : optionText;
          }
          if (!bankCode || !account || !bankName) {
            alert("請填寫完整銀行資訊");
            return;
          }
          paymentNotes = { bankCode, bankName, account };
        } else {
          alert("請選擇支付方式");
          return;
        }

        // 1. 先送付款資料
        const user = await getCurrentUserAsync();
        const idToken = await user.getIdToken();
        const paymentRes = await fetch(`${API_URL}/api/payments/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + idToken
          },
          body: JSON.stringify({
            eventId: eventId,
            paymentMethod,
            paymentNotes
          })
        });

        if (!paymentRes.ok) {
          const errorData = await paymentRes.json();
          throw new Error(errorData.error || '付款資料送出失敗');
        }

        // 2. 再送報名確認
        const confirmResponse = await fetch(`${API_URL}/api/enrollment/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + idToken
          },
          body: JSON.stringify({
            eventId: eventId
          })
        });

        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          throw new Error(errorData.error || '確認報名失敗');
        }

        const confirmData = await confirmResponse.json();
        alert(confirmData.message);

        // 跳轉到服務頁面
        window.location.href = 'services.html';

      } catch (error) {
        console.error('Error confirming enrollment:', error);
        alert('確認報名失敗：' + error.message);
      }
    });
  });
});