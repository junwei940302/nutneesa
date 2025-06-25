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

const publishNowCheckbox = document.querySelector('.publishNowCheckbox');
const arrangePublish = document.querySelector('.arrangePublish');

if(publishNowCheckbox.checked){
    arrangePublish.disabled = true;

}else if(!publishNowCheckbox.checked){
    arrangePublish.disabled = false;

}

publishNowCheckbox.addEventListener('change', function() {
    arrangePublish.disabled = this.checked;
});


const incomeAndOutcome = document.querySelector('.incomeAndOutcome');
const flowOption = {
    '收入｜Income': document.querySelector('.incomeType'),
    '支出｜Outcome': document.querySelector('.outcomeType'),
    '轉帳｜Transfer': document.querySelector('.transferType'),
};

function showFlowOption(selected) {
    Object.keys(flowOption).forEach(key => {
        if (key === selected) {
            flowOption[key].style.display = 'block';
        } else {
            flowOption[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showFlowOption(incomeAndOutcome.value);

// 監聽選擇變更
incomeAndOutcome.addEventListener('change', function() {
    showFlowOption(this.value);
});