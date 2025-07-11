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
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const mongoose = require("mongoose");//delete
const crypto = require("crypto");//delete
const MongoStore = require("connect-mongo");
const News = require("./models/news");
const History = require("./models/history");
const Members = require("./models/members");
// const Flows = require("./models/flows");
const Events = require("./models/events");
const Forms = require("./models/forms");
const Responses = require("./models/responses");
const { adminRouter } = require("./adminServer");
const { userRouter } = require("./userServer");

// 只在本地開發時載入 dotenv
if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// 取得環境變數 - Firebase Functions v2 直接使用環境變數
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing in environment variables!");
}
const MONGODB_URI = process.env.MONGODB_URI;//delete
const SESSION_SECRET = process.env.SESSION_SECRET;
// FRONTEND_URLS 不再需要，因為我們使用 rewrites

const app = express();

// 環境變數已設定，但 CORS 由 V2 和 rewrites 處理
console.log("- Session secret configured:", !!SESSION_SECRET);

/**
 * Express app setup and middleware
 * 設定 CORS、Session、MongoDB 等中介軟體。
 */
// 簡化的 CORS 設定，因為 V2 已經處理了基本的 CORS
app.use(cors({
  origin: true, // 允許所有 origin，因為我們使用 rewrites
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    ttl: 14*24*60*60,
    crypto: {
      secret: SESSION_SECRET,
    },
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.set("trust proxy", 1);

app.get("/", (req, res) => {
  res.json({message: "API is running!"});
});


app.use("/api/admin", adminRouter);
app.use("/api", userRouter);

exports.api = onRequest(
    {
      invoker: "public",
      cors: true, // 啟用 CORS 支援
      region: "us-central1",
      memory: "512MiB",
      timeoutSeconds: 60,
      maxInstances: 3,
      minInstances: 0,
    },
    app
);
