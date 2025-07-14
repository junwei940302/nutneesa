document.addEventListener('DOMContentLoaded', function() {
    const countdownElement = document.querySelector('.countdown h1');
    const targetTimestamp = 1758189600 * 1000; // Convert to milliseconds

    function updateCountdown() {
        const now = Date.now();
        let diff = Math.max(0, Math.floor((targetTimestamp - now) / 1000));

        const days = Math.floor(diff / (24 * 3600));
        diff %= 24 * 3600;
        const hours = Math.floor(diff / 3600);
        diff %= 3600;
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;

        const formatted = `${String(days).padStart(2, '0')}天${String(hours).padStart(2, '0')}時${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`;
        countdownElement.textContent = formatted;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

    var video = document.querySelector('.bg-video');
    function playVideoOnUserInteraction() {
        if (video.paused) {
            video.play();
        }
        // 只需要触发一次
        document.removeEventListener('touchstart', playVideoOnUserInteraction);
        document.removeEventListener('click', playVideoOnUserInteraction);
    }
    document.addEventListener('touchstart', playVideoOnUserInteraction);
    document.addEventListener('click', playVideoOnUserInteraction);
});

function getTypeClass(type) {
    switch(type) {
        case '重要通知':
            return 'important';
        case '系會資訊':
            return 'information';
        case '活動快訊':
            return 'activity';
        case '會員專屬':
            return 'member';
        default:
            return type;
    }
}

function getTypeIcon(type) {
    switch(type) {
        case '重要通知':
            return '<i class="fa-solid fa-circle-exclamation"></i>';
        case '系會資訊':
            return '<i class="fa-solid fa-circle-info"></i>';
        case '活動快訊':
            return '<i class="fa-solid fa-gamepad"></i>';
        case '會員專屬':
            return '<i class="fa-solid fa-web-awesome"></i>';
        default:
            return type;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const infoCard = document.querySelector('.infoCard');
    try {
        // 先取得會員狀態
        let memberStatus = null;
        try {
            const user = await getCurrentUserAsync();
            const idToken = await user.getIdToken();
            const meRes = await fetch(`${API_URL}/api/me`, {
                headers: { Authorization: 'Bearer ' + idToken }
            });
            const meData = await meRes.json();
            if (meData.loggedIn && meData.user) {
                memberStatus = meData.user.isActive;
            }
        } catch (err){
            console.log('Failed to verify identity:' + err);
        }
        // 取得最新消息
        const res = await fetch(`${API_URL}/api/news`);
        let newsList = await res.json();
        // 若未登入或 status 不是「生效中」，過濾掉 type 為「會員專屬」的消息
        if (memberStatus !== '生效中') {
            newsList = newsList.filter(news => news.type !== '會員專屬');
        }
        infoCard.innerHTML = newsList.map(news => `
            <div class="news-item">
                <h3 class="${getTypeClass(news.type)}">${getTypeIcon(news.type)} ${news.type}</h3>
                <p>${news.content}</p>
                <div>${new Date(news.publishDate).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (err) {
        infoCard.innerHTML = '<p>無法載入最新消息。</p>';
    }
});
