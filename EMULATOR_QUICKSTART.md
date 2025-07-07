# Firebase Functions 本地 Emulator 快速啟動教學

## Quickstart Guide for Local Emulator (Firebase Functions)

---

## 1. 前置需求 Prerequisites

- 已安裝 Node.js、npm
- 已安裝 Firebase CLI  
  Install Firebase CLI:
  ```bash
  npm install -g firebase-tools
  ```
- 已在專案根目錄執行過 `firebase init functions`

---

## 2. 安裝 Functions 依賴套件  
Install dependencies in `functions/`:

```bash
cd functions
npm install
cd ..
```

---

## 3. 啟動本地 Emulator  
Start the local emulator:

```bash
firebase emulators:start --only functions
```

- 預設 Functions 會在 `http://localhost:5001/nutneesa-b8ea5/us-central1/api`
- 你可以同時啟動其他 emulator（如 firestore、auth），例如：
  ```bash
  firebase emulators:start
  ```

---

## 4. 前端如何連接本地 API  
How frontend connects to local API

- `frontend/src/env.js` 已經設定好，會自動切換本地與正式 API_URL。
- 前端直接啟動即可（例如 `npm start` 或 `vite`）。

---

## 5. 推薦 package.json script  
Recommended scripts in root `package.json`:

```json
{
  "scripts": {
    "emulator": "firebase emulators:start --only functions",
    "emulator:all": "firebase emulators:start",
    "frontend": "cd frontend && npm start"
  }
}
```

這樣你可以用以下指令快速啟動：
- 只啟動 functions emulator：  
  `npm run emulator`
- 啟動所有 emulator（functions, firestore, auth...）：  
  `npm run emulator:all`
- 啟動前端：  
  `npm run frontend`

---

## 6. .env 設定（本地開發用）  
Local .env example for `functions/.env`:

```
FRONTEND_URLS=http://localhost:3000
MONGODB_URI=你的本地或雲端MongoDB連線字串
SESSION_SECRET=本地開發密鑰
NODE_ENV=development
```

---

## 7. 常見問題 FAQ

- **Q:** 本地 emulator 跑不起來？  
  **A:** 檢查 `functions` 目錄下有無 `node_modules`，有無安裝好依賴。
- **Q:** 前端 API 無法連線？  
  **A:** 檢查 `API_URL` 是否正確，emulator 是否啟動。

---

## 8. 中文總結

1. `npm run emulator` 啟動本地 Functions
2. `npm run frontend` 啟動前端
3. 前端自動連接本地 API

---

如需自動化腳本或遇到任何 emulator 問題，請隨時告訴我！  
If you need automation scripts or run into any emulator issues, just let me know! 