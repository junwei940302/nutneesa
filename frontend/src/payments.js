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
      const meRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
      const meData = await meRes.json();
      if (meData.loggedIn && meData.user) {
        userStatus = meData.user.status;
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
        // 確認報名成功
        const confirmResponse = await fetch(`${API_URL}/api/enrollment/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
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