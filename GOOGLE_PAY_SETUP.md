# Google Pay API 設置指南

## 概述
本項目已整合 Google Pay API，允許用戶使用 Google Pay 進行支付。

## 文件結構
```
frontend/
├── payments.html          # 支付頁面
├── src/
│   ├── payments.js        # Google Pay 主要邏輯
│   ├── google-pay-config.js # Google Pay 配置文件
│   └── payments.css       # 支付頁面樣式
└── GOOGLE_PAY_SETUP.md    # 本文件
```

## 設置步驟

### 1. 獲取 Google Pay 商家 ID
1. 訪問 [Google Pay API Console](https://pay.google.com/business/console)
2. 創建或選擇您的商家帳戶
3. 獲取商家 ID (Merchant ID)

### 2. 選擇支付網關
Google Pay 需要通過支付網關處理支付。常用的支付網關包括：
- Stripe
- PayPal
- Square
- 其他本地支付網關

### 3. 配置支付網關
聯繫您選擇的支付網關，獲取：
- 網關名稱 (Gateway Name)
- 網關商家 ID (Gateway Merchant ID)

### 4. 更新配置文件
編輯 `frontend/src/google-pay-config.js`：

```javascript
const GOOGLE_PAY_CONFIG = {
  environment: 'TEST', // 測試完成後改為 'PRODUCTION'
  
  merchantInfo: {
    merchantName: '國立臺南大學電機系系學會',
    merchantId: 'your-actual-merchant-id' // 替換為您的商家 ID
  },
  
  paymentGateway: {
    gateway: 'your-gateway-name', // 替換為您的支付網關名稱
    gatewayMerchantId: 'your-gateway-merchant-id' // 替換為您的網關商家 ID
  },
  
  // ... 其他配置
};
```

### 5. 測試設置
1. 在測試環境中測試 Google Pay 功能
2. 確保支付流程正常運作
3. 檢查錯誤處理和用戶體驗

### 6. 部署到生產環境
1. 將 `environment` 改為 `'PRODUCTION'`
2. 確保所有配置都是生產環境的設置
3. 測試生產環境的支付流程

## 功能特性

### 支持的支付方法
- Mastercard
- Visa
- JCB (日本信用卡)

### 按鈕樣式選項
- 顏色：白色、黑色、默認
- 類型：預訂、購買、結帳、訂單、訂閱、捐贈、純文字
- 圓角：0-40 像素
- 語言：英文、繁體中文、日文、韓文

### 響應式設計
- 支持桌面和移動設備
- 自適應佈局
- 觸控友好的界面

## 錯誤處理

### 常見錯誤
1. **Google Pay 不可用**：用戶設備不支持 Google Pay
2. **支付取消**：用戶主動取消支付
3. **網絡錯誤**：網絡連接問題
4. **配置錯誤**：商家 ID 或網關配置錯誤

### 錯誤處理策略
- 顯示用戶友好的錯誤消息
- 提供替代支付方式
- 記錄錯誤日誌用於調試

## 安全考慮

### 數據保護
- 支付數據通過 Google Pay 安全傳輸
- 不在本地存儲敏感支付信息
- 使用 HTTPS 協議

### 驗證
- 驗證支付網關返回的數據
- 檢查交易狀態
- 實現適當的錯誤處理

## 自定義選項

### 修改交易信息
在 `payments.js` 中修改 `transactionInfo`：

```javascript
const transactionInfo = {
  totalPriceStatus: 'FINAL',
  totalPriceLabel: '總計',
  totalPrice: '123.45', // 動態設置金額
  currencyCode: 'TWD',
  countryCode: 'TW'
};
```

### 添加支付回調
在 `processPayment` 函數中添加您的業務邏輯：

```javascript
function processPayment(paymentData) {
  // 發送到後端處理
  fetch('/api/process-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData)
  })
  .then(response => response.json())
  .then(data => {
    // 處理支付結果
    console.log('支付成功:', data);
  })
  .catch(error => {
    console.error('支付失敗:', error);
  });
}
```

## 故障排除

### Google Pay 按鈕不顯示
1. 檢查瀏覽器控制台是否有錯誤
2. 確認 Google Pay 腳本已正確加載
3. 檢查設備是否支持 Google Pay

### 支付失敗
1. 檢查商家 ID 和網關配置
2. 確認測試卡號是否有效
3. 檢查網絡連接

### 樣式問題
1. 檢查 CSS 文件是否正確加載
2. 確認按鈕配置是否正確
3. 測試不同設備和瀏覽器

## 支持
如有問題，請聯繫：
- 技術支持：[您的聯繫方式]
- Google Pay 文檔：[https://developers.google.com/pay/api](https://developers.google.com/pay/api) 