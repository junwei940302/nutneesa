let isFoldMenu = true;

const menuBtn = document.querySelector('.navIcon');
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