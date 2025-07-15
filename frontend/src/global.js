let isFoldMenu = true;

const menuBtn = document.querySelector('.navIcon');
if (menuBtn) {
  menuBtn.addEventListener('click', function() {
      if(isFoldMenu){
          document.querySelector('.navIcon i').className = "fa-solid fa-xmark";
          document.querySelector('.navBar').style.height = '100vh';
          document.querySelector('.navBar').style.alignItems = 'start';
          document.querySelector('.mobileMenu').style.display = 'grid';
          document.querySelector('.toTop').style.display = 'none';
          isFoldMenu = false;
      } else if(!isFoldMenu){
          document.querySelector('.navIcon i').className = "fa-solid fa-bars";
          document.querySelector('.navBar').style.height = '40px';
          document.querySelector('.mobileMenu').style.display = 'none';
          document.querySelector('.toTop').style.display = 'block';
          isFoldMenu = true;
      }
  });
}

// Go to Top 功能
const toTopDiv = document.querySelector('.toTop');
const getToTopBtn = document.querySelector('.getToTop');

// 顯示/隱藏 .toTop 按鈕
if (toTopDiv) {
  window.addEventListener('scroll', function() {
      if (window.scrollY > 200) {
          toTopDiv.classList.remove('hidden');
      } else {
          toTopDiv.classList.add('hidden');
      }
  });
}

// 點擊按鈕回到頂部
if (getToTopBtn) {
  getToTopBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 請確保 .toTop 元素在 HTML 初始有 'hidden' class，例如：<div class="toTop hidden">...</div>