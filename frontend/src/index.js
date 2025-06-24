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
});
