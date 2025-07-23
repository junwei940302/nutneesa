function onRecaptchaSuccess(token) {
  // 前端 token 驗證，送到後端
  fetch(`${API_URL}/api/recaptcha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      document.getElementById('recaptcha-overlay').style.display = 'none';
    } else {
      alert('reCAPTCHA 驗證失敗，請重試！');
      grecaptcha.reset();
    }
  })
  .catch(() => {
    alert('伺服器錯誤，請稍後再試！');
    grecaptcha.reset();
  });
}
const serviceSelector = document.querySelector('.serviceSelector');
const infoCards = {
    '新生專區': document.querySelector('.infoCard[data-freshman]'),
    '活動報名': document.querySelector('.infoCard[data-enroll]'),
    '活動相簿': document.querySelector('.infoCard[data-photo]'),
    '大府城美食地圖': document.querySelector('.infoCard[data-map]'),
    '系會收支紀錄': document.querySelector('.infoCard[data-flowHistory]'),
    '系會會議紀錄': document.querySelector('.infoCard[data-conferenceHistory]')
};

function showInfoCard(selected) {
    Object.keys(infoCards).forEach(key => {
        if (key === selected) {
            infoCards[key].style.display = '';
        } else {
            infoCards[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showInfoCard(serviceSelector.value);

// 取得活動搜尋器控件
const activitySearcher = document.querySelector('.activitySearcher');
let activityStatusSelect, activityTypeSelect, freeOnlyCheckbox;
if (activitySearcher) {
    activityStatusSelect = activitySearcher.querySelector('.activityStatus');
    activityTypeSelect = activitySearcher.querySelector('.activityType');
    freeOnlyCheckbox = activitySearcher.querySelector('input[type="checkbox"]');
}

// 監聽搜尋器變化
if (activitySearcher) {
    [activityStatusSelect, activityTypeSelect, freeOnlyCheckbox].forEach(el => {
        el.addEventListener('change', () => {
            fetchAndRenderEvents();
        });
    });
}

// 動態載入活動報名卡片（加上篩選功能）
async function fetchAndRenderEvents() {
    window.showLoading();
    try {
        const res = await fetch(`${API_URL}/api/events`);
        let events = await res.json();
        // 取得會員狀態
        let memberStatus = null;
        try {
            const user = firebase.auth().currentUser;
            const idToken = await user.getIdToken();
            const res = await fetch(`${API_URL}/api/me`, {
                headers: { Authorization: 'Bearer ' + idToken }
            });
            const data = await res.json();
            if (data.loggedIn && data.user) {
                memberStatus = data.user.status;
            }
        } catch {}
        const activityPanels = document.querySelector('.activityPanels');
        if (!activityPanels) return;
        activityPanels.innerHTML = '';

        // 取得篩選條件
        let statusFilter = activityStatusSelect ? activityStatusSelect.value : '全部';
        let typeFilter = activityTypeSelect ? activityTypeSelect.value : '全部';
        let freeOnly = freeOnlyCheckbox ? freeOnlyCheckbox.checked : false;

        // 篩選活動
        events = events.filter(e => e.visibility);
        if (statusFilter && statusFilter !== '全部') {
            // 假設 event.status 有對應狀態，否則請調整這裡
            events = events.filter(e => e.status === statusFilter);
        }
        if (typeFilter && typeFilter !== '全部') {
            // 假設 event.hashtag 直接等於 #實習 這種格式
            events = events.filter(e => e.hashtag === typeFilter);
        }
        if (freeOnly) {
            // 會員或非會員價格皆為 0 視為免費
            events = events.filter(e => (Number(e.memberPrice) || 0) === 0 && (Number(e.nonMemberPrice) || 0) === 0);
        }

        // 依照活動狀態排序：將'活動結束'的活動排到最後
        events.sort((a, b) => {
            if (a.status === '活動結束' && b.status !== '活動結束') return 1;
            if (a.status !== '活動結束' && b.status === '活動結束') return -1;
            return 0;
        });

        events.forEach(event => {
            // 限制條件
            let hashtags = '';
            hashtags += `<p class="hashtag event">${event.hashtag || ''}</p>`;
            if (event.status) {
                hashtags += `<p class="hashtag status">${event.status}</p>`;
            }
            if (event.restrictQuantity === 0) {
                hashtags += `<p class="hashtag event">人數無上限</p>`;
            } else if (event.restrictQuantity > 0) {
                hashtags += `<p class="hashtag event">${event.enrollQuantity || 0}/${event.restrictQuantity}</p>`;
            }
            if (event.restrictDepartment) hashtags += `<p class="hashtag event">系別限制</p>`;
            if (event.restrictYear) hashtags += `<p class="hashtag event">年級限制</p>`;
            if (event.restrictMember) hashtags += `<p class="hashtag event">會員專屬</p>`;
            // 價格顯示邏輯
            let priceText = '';
            const nonMemberPrice = Number(event.nonMemberPrice) || 0;
            const memberPrice = Number(event.memberPrice) || 0;
            if (memberStatus === '生效中') {
                if (memberPrice === 0) {
                    priceText = '免費參與';
                } else if (memberPrice === nonMemberPrice) {
                    priceText = `新台幣 ${memberPrice} 元`;
                } else {
                    priceText = `新台幣 ${memberPrice} 元（已套用會員優惠）`;
                }
            } else {
                if (nonMemberPrice === 0) {
                    priceText = '免費參與';
                } else {
                    priceText = `新台幣 ${nonMemberPrice} 元`;
                }
            }
            // 卡片
            const card = document.createElement('div');
            card.className = 'activityItem';
            card.innerHTML = `
                <img src="${event.imgUrl}" title="活動插圖">
                <div class="textZone">
                    <h2>${event.title || ''}</h2>
                    <div class="activityHashtag">${hashtags}</div>
                    <div class="activityContent">
                        <p>${event.content || ''}</p>
                        <div class="activityPrice">
                            <h3>${priceText}</h3>
                        </div>
                        <div class="btnZone">
                            <button class="readMore" data-id="${event._id}" title="詳細資料">詳細資料</button>
                            ${event.status === '開放報名' ? '<button class="enrollBtn" title="報名">報名</button>' : ''}
                        </div>
                    </div>
                </div>
            `;
            activityPanels.appendChild(card);
        });

        // 新增：監聽「詳細資料」按鈕，導向 events.html?id=活動id
        // 新增：監聽「報名」按鈕，導向 form.html?id=活動id
        if (activityPanels) {
            activityPanels.addEventListener('click', function(e) {
                if (e.target.classList.contains('readMore')) {
                    const id = e.target.getAttribute('data-id');
                    window.location.href = `events.html?id=${id}`;
                } else if (e.target.classList.contains('enrollBtn')) {
                    const id = e.target.closest('.activityItem').querySelector('.readMore').getAttribute('data-id');
                    window.location.href = `form.html?eventId=${id}`;
                }
            });
        }
    } catch (err) {
        console.error('活動載入失敗', err);
    } finally {
        window.hideLoading();
    }
}


// 載入地圖輪播數據
async function loadMapCarousel() {
    window.showLoading();
    try {
        const res = await fetch(`${API_URL}/api/maps`);
        
        if (!res.ok) {
            console.error('API request failed:', res.status, res.statusText);
            return;
        }
        
        const maps = await res.json();
        
        // 檢查maps是否為數組
        if (!Array.isArray(maps)) {
            console.error('Maps data is not an array:', maps);
            return;
        }
        
        if (maps.length === 0) {
            console.log('No map data available');
            window.hideLoading();
            return;
        }
        
        // 過濾出有image或imgUrl的地圖
        const mapsWithImages = maps.filter(map => map.image || map.imgUrl);
        
        if (mapsWithImages.length === 0) {
            // 使用默認圖片作為備用
            const defaultImages = [
                'https://via.placeholder.com/200x120/645038/ffffff?text=美食地圖1',
                'https://via.placeholder.com/200x120/8B4513/ffffff?text=美食地圖2',
                'https://via.placeholder.com/200x120/CD853F/ffffff?text=美食地圖3',
                'https://via.placeholder.com/200x120/D2691E/ffffff?text=美食地圖4',
                'https://via.placeholder.com/200x120/FF8C00/ffffff?text=美食地圖5'
            ];
            
            const defaultMaps = defaultImages.map((url, index) => ({
                imgUrl: url,
                name: `美食地圖 ${index + 1}`
            }));
            
            const shuffledMaps = [...defaultMaps].sort(() => Math.random() - 0.5);
            
            // 為每個輪播行創建圖片
            const rows = document.querySelectorAll('.carousel-track');
            let imgCount = 0, loadedCount = 0;
            rows.forEach((track, rowIndex) => {
                track.innerHTML = '';
                for (let i = 0; i < 3; i++) {
                    shuffledMaps.forEach((map) => {
                        const item = document.createElement('div');
                        item.className = 'carousel-item';
                        const img = document.createElement('img');
                        img.src = map.imgUrl;
                        img.alt = map.name;
                        img.title = map.name;
                        imgCount++;
                        img.onload = img.onerror = function() {
                            loadedCount++;
                            if (loadedCount === imgCount) {
                                window.hideLoading();
                            }
                        };
                        item.appendChild(img);
                        track.appendChild(item);
                    });
                }
            });
            // 若沒有圖片，直接 hideLoading
            if (imgCount === 0) window.hideLoading();
            return;
        }
        
        // 為每個輪播行創建圖片
        const rows = document.querySelectorAll('.carousel-track');
        let imgCount = 0, loadedCount = 0;
        // 創建兩個不同的隨機順序，並錯開起始位置
        const shuffledMaps1 = [...mapsWithImages].sort(() => Math.random() - 0.5);
        const shuffledMaps2 = [...mapsWithImages].sort(() => Math.random() - 0.5);
        const offset = Math.floor(mapsWithImages.length / 2);
        const shiftedMaps2 = [
            ...shuffledMaps2.slice(offset),
            ...shuffledMaps2.slice(0, offset)
        ];
        rows.forEach((track, rowIndex) => {
            track.innerHTML = '';
            const shuffledMaps = rowIndex === 0 ? shuffledMaps1 : shiftedMaps2;
            for (let i = 0; i < 3; i++) {
                const cycleOffset = Math.floor(Math.random() * shuffledMaps.length);
                const cycledMaps = [
                    ...shuffledMaps.slice(cycleOffset),
                    ...shuffledMaps.slice(0, cycleOffset)
                ];
                cycledMaps.forEach((map, mapIndex) => {
                    const item = document.createElement('div');
                    item.className = 'carousel-item';
                    const img = document.createElement('img');
                    const imageUrl = map.image || map.imgUrl;
                    img.src = imageUrl;
                    img.alt = map.name || '地圖圖片';
                    img.title = map.name || '地圖圖片';
                    imgCount++;
                    img.onload = img.onerror = function() {
                        loadedCount++;
                        if (loadedCount === imgCount) {
                            window.hideLoading();
                        }
                    };
                    item.appendChild(img);
                    track.appendChild(item);
                });
            }
        });
        // 若沒有圖片，直接 hideLoading
        if (imgCount === 0) window.hideLoading();
        
    } catch (err) {
        console.error('地圖輪播載入失敗', err);
        window.hideLoading();
    }
}

// 數字動畫函數
function animateNumber(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const difference = end - start;
    
    // 添加動畫類
    element.classList.add('animating');
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用 easeOutQuart 緩動函數
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentNumber = Math.floor(start + (difference * easeProgress));
        
        element.textContent = currentNumber;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            // 動畫結束，移除動畫類
            setTimeout(() => {
                element.classList.remove('animating');
            }, 300);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// 載入地圖分類數量並更新顯示
async function loadMapCategoryCounts() {
    window.showLoading();
    try {
        const res = await fetch(`${API_URL}/api/maps`);
        
        if (!res.ok) {
            console.error('API request failed:', res.status, res.statusText);
            return;
        }
        
        const maps = await res.json();
        
        // 檢查maps是否為數組
        if (!Array.isArray(maps)) {
            console.error('Maps data is not an array:', maps);
            return;
        }
        
        // 過濾出可見的地圖
        const visibleMaps = maps.filter(map => map.visibility !== false);
        
        // 統計各分類數量
        const categoryCounts = {
            'A級美食嘉年華': visibleMaps.filter(map => map.category === 'A級美食嘉年華').length,
            'B級美食嘉年華': visibleMaps.filter(map => map.category === 'B級美食嘉年華').length,
            '咖啡廳及甜點店': visibleMaps.filter(map => map.category === '咖啡廳及甜點店').length,
            'total': visibleMaps.length
        };
        
        console.log('Category counts:', categoryCounts);
        
        // 設置滾動監聽，當元素進入視窗時才開始動畫
        setupScrollAnimation(categoryCounts);
        
    } catch (err) {
        console.error('載入地圖分類數量失敗', err);
    } finally {
        window.hideLoading();
    }
}

// 設置滾動動畫
function setupScrollAnimation(categoryCounts) {
    const mapContents = document.querySelectorAll('.mapContent');
    
    // 重置所有元素的動畫狀態
    mapContents.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        const span = element.querySelector('span');
        if (span) {
            span.textContent = '0';
            span.classList.remove('animating');
        }
    });
    
    const animatedElements = new Set(); // 記錄已經動畫過的元素
    
    // 開始動畫
    function startAnimation(element, count) {
        if (animatedElements.has(element)) return; // 避免重複動畫
        
        animatedElements.add(element);
        
        // 添加淡入效果
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        
        // 延遲一下再開始淡入
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            
            // 淡入完成後開始數字動畫
            setTimeout(() => {
                const span = element.querySelector('span');
                if (span) {
                    animateNumber(span, 0, count, 1500);
                }
            }, 800);
        }, 100);
    }
    
    // 使用 Intersection Observer API 提高性能
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animatedElements.has(entry.target)) {
                let count = 0;
                const element = entry.target;
                
                // 根據元素類別決定顯示的數量
                if (element.classList.contains('allItem')) {
                    count = categoryCounts.total;
                } else if (element.classList.contains('AClass')) {
                    count = categoryCounts['A級美食嘉年華'];
                } else if (element.classList.contains('BClass')) {
                    count = categoryCounts['B級美食嘉年華'];
                } else if (element.classList.contains('Cafe')) {
                    count = categoryCounts['咖啡廳及甜點店'];
                }
                
                startAnimation(element, count);
            }
        });
    }, {
        threshold: 0.3, // 當元素 30% 可見時觸發
        rootMargin: '0px 0px -50px 0px' // 提前 50px 觸發
    });
    
    // 觀察所有 mapContent 元素
    mapContents.forEach(element => {
        observer.observe(element);
    });
}

// 監聽 serviceSelector 變更時才載入對應資料
serviceSelector.addEventListener('change', async function() {
    // 當選擇大府城美食地圖時載入輪播和分類數量
    if (this.value === '大府城美食地圖') {
        loadMapCarousel();
        loadMapCategoryCounts();
    }
    
    if (this.value === '會員相關服務') {
        const user = await getCurrentUserAsync();
        if (!user) {
            alert('本服務需先登入');
            window.location.href = 'login.html';
            return;
        }
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/me`, {
            headers: { Authorization: 'Bearer ' + idToken }
        });
        const data = await res.json();
        if (data.loggedIn && data.user) {
            const user = data.user;
            // 依序填入 table
            const infoTable = document.querySelector('.personalInfo table');
            if (infoTable) {
                const tds = infoTable.querySelectorAll('td:nth-child(2)');
                tds[0].textContent = user.memberId || '載入中';
                tds[1].textContent = user.displayName || '載入中';
                tds[2].textContent = user.studentId || '載入中';
                tds[3].textContent = user.gender || '載入中';
                tds[4].textContent = user.departmentYear || '載入中';
                tds[5].textContent = user.email || '載入中';
                tds[6].textContent = user.phoneNumber || '載入中';
                // 狀態顯示（isActive: string）
                let statusText = '載入中';
                if (user.isActive === '生效中') statusText = '生效中';
                else if (user.isActive === '待驗證') statusText = '待驗證';
                else if (user.isActive === '未生效') statusText = '未生效';
                else if (user.isActive === '已撤銷') statusText = '已撤銷';
                tds[7].textContent = statusText;
                tds[8].textContent = user.emailVerified ? '已驗證' : '未驗證';
            }
            const qrImg = document.querySelector('.personalInfo img');
            if (qrImg && user.memberId) {
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(user.memberId)}`;
            }
            // 檢查是否為管理員或系學會成員，控制 .hrefAdmin 按鈕顯示
            const hrefAdminBtn = document.querySelector('.hrefAdmin');
            if (hrefAdminBtn) {
                if (user.role === '管理員' || user.role === '系學會人員') {
                    hrefAdminBtn.style.display = '';
                } else {
                    hrefAdminBtn.style.display = 'none';
                }
            }
            // 載入用戶報名記錄
            await loadUserEnrollmentHistory();
        }
    } else if (this.value === '活動報名') {
        await fetchAndRenderEvents();
    }
    showInfoCard(this.value);
});

// 載入用戶報名記錄
async function loadUserEnrollmentHistory() {
    window.showLoading();
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/responses/user`, {
            headers: { Authorization: 'Bearer ' + idToken }
        });
        if (!res.ok) {
            console.error('Failed to fetch enrollment history');
            return;
        }
        const enrollments = await res.json();
        const tableBody = document.querySelector('.enrollmentTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (enrollments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">尚無報名記錄</td></tr>';
            return;
        }
        enrollments.forEach((enrollment, index) => {
            const tr = document.createElement('tr');
            const submittedDate = new Date(enrollment.submittedAt).toLocaleString('zh-TW');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${enrollment.eventTitle}</td>
                <td>已填寫 (${submittedDate})</td>
                <td>${enrollment.amount > 0 ? `NT$ ${enrollment.amount}` : '免費'}</td>
                <td>${enrollment.paymentMethod}</td>
                <td>${enrollment.paymentStatus}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading enrollment history:', err);
    } finally {
        window.hideLoading();
    }
}

// 恢復：自動檢查登入，若已登入則自動切換到會員相關服務並載入資料
(async function autoSelectMemberServiceIfLoggedIn() {
    if (serviceSelector.value === '新生專區' && await checkLogin()) {
        // 觸發 change 事件以載入會員資料與顯示卡片
        const event = new Event('change', { bubbles: true });
        serviceSelector.dispatchEvent(event);
        const matlabKey = document.querySelector('.matlabKey');
        if (matlabKey) {
            matlabKey.innerHTML = '13550-01396-46365-69095-09126';
            matlabKey.classList.remove('unauthorize');
            matlabKey.classList.add('authorized');
        }
    }
})();

async function checkLogin() {
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            return false;
        }
        await user.reload();
        const idToken = await user.getIdToken();
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await res.json();
        return data.loggedIn;
    } catch {
        return false;
    }
}

// 頁面初始時只根據預設選項載入一次
(async function initPanel() {
    if (serviceSelector.value === '活動報名') {
        await fetchAndRenderEvents();
    } else if (serviceSelector.value === '大府城美食地圖') {
        loadMapCarousel();
        loadMapCategoryCounts();
    }
})();

// 登出功能
const logoutBtn = document.querySelector('.logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await firebase.auth().signOut();
        window.location.reload();
    });
}

// 進入控制中心功能
const hrefAdminBtn = document.querySelector('.hrefAdmin');
if (hrefAdminBtn) {
    hrefAdminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
}

// Hash <-> serviceSelector sync
function setSelectorByHash() {
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (!hash) return;
    const options = Array.from(serviceSelector.options).map(o => o.text);
    if (options.includes(hash)) {
        serviceSelector.value = hash;
        // 觸發 change 事件
        serviceSelector.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

window.addEventListener('hashchange', setSelectorByHash);

document.addEventListener('DOMContentLoaded', function() {
  const selector = document.querySelector('.serviceSelector');
  const overlay = document.getElementById('recaptcha-overlay');
  const recaptchaContainer = document.getElementById('recaptcha-container');
  let recaptchaVerified = false;
  let recaptchaWidgetId = null;

  function showRecaptchaOverlay() {
    overlay.style.display = 'flex';
    if (window.grecaptcha) {
      if (recaptchaWidgetId === null) {
        recaptchaWidgetId = grecaptcha.render(recaptchaContainer, {
          sitekey: '6LdrKYorAAAAADafKsfVXcPlK5kGaVhfrbAVexKA',
          callback: onRecaptchaSuccess
        });
      } else {
        grecaptcha.reset(recaptchaWidgetId);
      }
    }
  }

  if (selector) {
    selector.addEventListener('change', function() {
      if (selector.value === '活動相簿') {
        if (!recaptchaVerified) {
          showRecaptchaOverlay();
        }
      } else {
        overlay.style.display = 'none';
      }
    });
  }

  window.onRecaptchaSuccess = function(token) {
    fetch(`${window.API_URL}/api/recaptcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        overlay.style.display = 'none';
        recaptchaVerified = true;
      } else {
        alert('reCAPTCHA 驗證失敗，請重試！');
        if (window.grecaptcha && recaptchaWidgetId !== null) grecaptcha.reset(recaptchaWidgetId);
      }
    })
    .catch(() => {
      alert('伺服器錯誤，請稍後再試！');
      if (window.grecaptcha && recaptchaWidgetId !== null) grecaptcha.reset(recaptchaWidgetId);
    });
  };
});

// select 變動時自動更新 hash
serviceSelector.addEventListener('change', function() {
    window.location.hash = encodeURIComponent(this.value);
});

