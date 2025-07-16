/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

/**
 * Firebase Functions API entry point
 * 所有 API 路由與中介軟體設定於本檔案。
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onInit} = require("firebase-functions/v2");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { adminRouter } = require("./adminServer");
const { userRouter } = require("./userServer");
const { firebaseAuthMiddleware } = require("./utils");

// 只在本地開發時載入 dotenv
if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();

// 環境變數已設定，但 CORS 由 V2 和 rewrites 處理
console.log("- Session secret configured:", !!process.env.SESSION_SECRET);

/**
 * Express app setup and middleware
 * 設定 CORS、JSON、Cookie 等中介軟體。
 */
app.use(cors({
  origin: true, // 允許所有 origin，因為我們使用 rewrites
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", 1);

app.get("/", (req, res) => {
  res.json({message: "API is running!"});
});

app.use("/api/admin", firebaseAuthMiddleware, adminRouter);
app.use("/api", userRouter);

// --- export function as usual ---
exports.api = onRequest(
  {
    invoker: "public",
    cors: true, // 啟用 CORS 支持
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    maxInstances: 3,
    minInstances: 0,
  },
  app,
);
