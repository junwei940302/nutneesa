const funcPicker = document.querySelector('.funcPicker');
const panels = {
    '控制中心｜Dashboard': document.querySelector('.panel[data-dashboard]'),
    '歷史紀錄｜History': document.querySelector('.panel[data-history]'),
    '會員管理｜Members': document.querySelector('.panel[data-members]'),
    '金流管理｜Flow': document.querySelector('.panel[data-flow]'),
    '偏好設定｜Settings': document.querySelector('.panel[data-settings]'),
};

function showPanel(selected) {
    Object.keys(panels).forEach(key => {
        if (key === selected) {
            panels[key].style.display = '';
        } else {
            panels[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showPanel(funcPicker.value);

// 監聽選擇變更
funcPicker.addEventListener('change', function() {
    showPanel(this.value);
});