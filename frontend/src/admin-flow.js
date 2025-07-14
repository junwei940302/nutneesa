// admin-flow.js
// 金流管理相關功能

const incomeAndOutcome = document.querySelector(".incomeAndOutcome");
const flowOption = {
    "收入｜Income": document.querySelector(".incomeType"),
    "支出｜Outcome": document.querySelector(".outcomeType"),
    "轉帳｜Transfer": document.querySelector(".transferType"),
};

function showFlowOption(selected) {
    Object.keys(flowOption).forEach(key => {
        if (key === selected) {
            flowOption[key].style.display = "block";
        } else {
            flowOption[key].style.display = "none";
        }
    });
}

// 初始化顯示
showFlowOption(incomeAndOutcome.value);

// 監聽選擇變更
incomeAndOutcome.addEventListener("change", function() {
    showFlowOption(this.value);
}); 