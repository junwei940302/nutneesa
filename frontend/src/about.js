
// 大標題滑入動畫
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { // 延遲確保 fragment/內容載入
    const mainTitles = document.querySelectorAll('.mainTitle');
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.3 });
    mainTitles.forEach(el => observer.observe(el));
  }, 100); // 100ms 延遲
});

