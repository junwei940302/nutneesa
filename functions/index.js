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

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const crypto = require("crypto");
const News = require("./models/news");
const History = require("./models/history");
const Members = require("./models/members");
// const Flows = require("./models/flows");
const Events = require("./models/events");

// 只在本地開發時載入 dotenv
if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// 環境變數取得函式
function getEnv(key, fallback) {
  if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV !== "production") {
    return process.env[key] || fallback;
  }
  if (key === "MONGODB_URI") return functions.config().mongodb.uri || fallback;
  if (key === "SESSION_SECRET") return functions.config().session.secret || fallback;
  if (key === "FRONTEND_URLS") return functions.config().frontend.urls || fallback;
  return fallback;
}

const MONGODB_URI = getEnv("MONGODB_URI", "");
const SESSION_SECRET = getEnv("SESSION_SECRET", "default_secret");
const FRONTEND_URLS = getEnv("FRONTEND_URLS", "").split(",");

const app = express();

// 解析環境變數成陣列
const allowedOrigins = FRONTEND_URLS;

/**
 * Express app setup and middleware
 * 設定 CORS、Session、MongoDB 等中介軟體。
 */
app.use(cors({
  origin: function(origin, callback) {
    // 允許本地測試時 origin 為 undefined
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.set("trust proxy", 1);

mongoose.connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected!"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.json({message: "API is running!"});
});

// Helper function for logging
async function logHistory(req, operation) {
  const executer = await Members.findById(req.session.userId);

  try {
    await History.create({
      alertDate: new Date(),
      alertPath: req.originalUrl,
      content: operation,
      executer: executer ? executer.name : "Unknown",
      confirm: false,
      securityChecker: "Uncheck",
    });
  } catch (err) {
    console.error("Failed to log history:", err);
  }
}

/**
 * API route handler: News APIs
 * 包含新聞相關的 API 路由。
 */
// 新增 API 路由
app.get("/news", async (req, res) => {
  try {
    const newsList = await News.find({visibility: true}).sort({publishDate: -1});
    res.json(newsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch news"});
  }
});

app.get("/admin/news", async (req, res) => {
  try {
    const newsList = await News.find({}).sort({publishDate: -1});
    res.json(newsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch news for admin"});
  }
});

app.patch("/admin/news/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {visibility} = req.body;

    if (typeof visibility !== "boolean") {
      return res.status(400).json({error: "Invalid visibility value"});
    }

    const updatedNews = await News.findByIdAndUpdate(
        id,
        {visibility},
        {new: true},
    );

    if (!updatedNews) {
      return res.status(404).json({error: "News not found"});
    }
    await logHistory(req, `Update news visibility: ${id} to ${visibility}`);
    res.json(updatedNews);
  } catch (err) {
    res.status(500).json({error: "Failed to update news visibility"});
  }
});

app.post("/admin/news", async (req, res) => {
  try {
    const {type, content, publishDate, visibility} = req.body;

    if (!type || !content) {
      return res.status(400).json({error: "Type and content are required"});
    }

    let publisherName = "N/A";
    const userId = req.session.userId;
    if (userId) {
      try {
        const member = await Members.findById(userId);
        if (member) {
          publisherName = member.name;
        }
      } catch (err) {
        console.error("Could not find publisher from session, using default. Error:", err.message);
      }
    }

    const newNews = new News({
      type,
      content,
      publisher: publisherName,
      createDate: new Date(),
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      visibility: visibility !== undefined ? visibility : true,
    });

    await newNews.save();
    await logHistory(req, `Create news: ${type} - ${content}`);
    res.status(201).json(newNews);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: "Failed to create news"});
  }
});

app.delete("/admin/news/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const deletedNews = await News.findByIdAndDelete(id);

    if (!deletedNews) {
      return res.status(404).json({error: "News not found"});
    }
    await logHistory(req, `Delete news: ${id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({error: "Failed to delete news"});
  }
});

// 新增會員列表 API
app.get("/admin/members", async (req, res) => {
  try {
    const membersList = await Members.find({});
    res.json(membersList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch members"});
  }
});

// 新增會員 API
app.post("/admin/members", async (req, res) => {
  try {
    const {role, name, status, studentId, departmentYear, email, phone, gender, verification} = req.body;
    if (!name) {
      return res.status(400).json({error: "Name is required"});
    }
    const newMember = new Members({
      role: role || "本系會員",
      name,
      status: status || "待驗證",
      studentId: studentId || "",
      departmentYear: departmentYear || "",
      email: email || "",
      phone: phone || "",
      gender: gender || "其他",
      verification: verification !== undefined ? verification : false,
      registerDate: new Date(),
      lastOnline: new Date(),
      cumulativeConsumption: 0,
    });
    await newMember.save();
    await logHistory(req, `Create member: ${name} (${email})`);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({error: "Failed to add member"});
  }
});

// 註銷 API
app.delete("/admin/members/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const deletedMember = await Members.findByIdAndDelete(id);
    if (!deletedMember) {
      return res.status(404).json({error: "Member not found"});
    }
    await logHistory(req, `Delete member: ${id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({error: "Failed to delete member"});
  }
});

// 新增歷史紀錄 API
app.get("/admin/history", async (req, res) => {
  try {
    const historyList = await History.find({}).sort({alertDate: -1});
    res.json(historyList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch history"});
  }
});

app.patch("/admin/history/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {confirm} = req.body;

    if (typeof confirm !== "boolean") {
      return res.status(400).json({error: "Invalid confirm value"});
    }

    let securityCheckerName = "Unknown";
    const userId = req.session.userId;
    if (userId) {
      try {
        const member = await Members.findById(userId);
        if (member) {
          securityCheckerName = member.name;
        }
      } catch (err) {
        console.error("Could not find member from session for security checker, using default. Error:", err.message);
      }
    }

    const updatedHistory = await History.findByIdAndUpdate(
        id,
        {
          confirm,
          securityChecker: confirm ? securityCheckerName : "Uncheck",
        },
        {new: true},
    );

    if (!updatedHistory) {
      return res.status(404).json({error: "History record not found"});
    }
    res.json(updatedHistory);
  } catch (err) {
    res.status(500).json({error: "Failed to update history"});
  }
});

function sha256(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * API route handler: Events APIs
 * 包含活動相關的 API 路由。
 */
// 註冊 API
app.post("/register", async (req, res) => {
  const {email, password, memberName, studentId, gender, departmentYear, phone} = req.body;
  if (!email || !password) {
    return res.json({success: false, message: "請填寫所有欄位 / Please fill all fields."});
  }
  try {
    const exist = await Members.findOne({email});
    if (exist) {
      return res.json({success: false, message: "Email 已註冊 / Email already registered."});
    }
    const targetRole = departmentYear && departmentYear.includes("電機") ? "本系會員" : "非本系會員";
    const hashed = sha256(password);
    const member = new Members({
      role: targetRole,
      name: memberName,
      status: "待驗證",
      studentId,
      gender,
      email,
      phone,
      departmentYear,
      registerDate: new Date(),
      lastOnline: new Date(),
      cumulativeConsumption: 0,
      verification: false,
      password: hashed,
    });
    await member.save();
    res.json({success: true, message: "註冊成功 / Register success!"});
  } catch (err) {
    res.status(500).json({success: false, message: "伺服器錯誤 / Server error."});
  }
});

// 登入 API
app.post("/login", async (req, res) => {
  const {email, password} = req.body;
  if (!email || !password) {
    return res.json({success: false, message: "請輸入帳號密碼 / Please enter email and password."});
  }
  try {
    const hashed = sha256(password);
    const member = await Members.findOne({email, password: hashed});
    if (!member) {
      return res.json({success: false, message: "帳號或密碼錯誤 / Invalid email or password."});
    }
    const memberId = member._id.toString();
    member.lastOnline = new Date();
    await member.save();
    req.session.userId = memberId;
    res.json({success: true, message: "登入成功 / Login success!", role: member.role});
  } catch (err) {
    res.status(500).json({success: false, message: "伺服器錯誤 / Server error."});
  }
});

// 登出 API
app.post("/logout", async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({success: false, message: "登出失敗 / Logout failed"});
    }
    res.clearCookie("connect.sid");
    res.json({success: true, message: "已登出 / Logged out"});
  });
});

// 新增 /api/me API，回傳登入狀態
app.get("/me", async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const userId = req.session.userId;
  if (!userId) return res.json({loggedIn: false});
  try {
    const member = await Members.findById(userId);
    if (!member) return res.json({loggedIn: false});
    res.json({
      loggedIn: true,
      user: {
        memberId: member._id,
        name: member.name,
        studentId: member.studentId,
        gender: member.gender,
        departmentYear: member.departmentYear,
        email: member.email,
        phone: member.phone,
        status: member.status,
        verification: member.verification,
        role: member.role,
      },
    });
  } catch (err) {
    res.status(500).json({loggedIn: false, error: "Server error"});
  }
});

/**
 * API route handler: Events APIs
 */
// 新增活動 API
app.post("/admin/events", async (req, res) => {
  try {
    const {
      imgUrl,
      title,
      hashtag,
      status,
      content,
      nonMemberPrice,
      memberPrice,
      eventDate,
      enrollQuantity,
      restrictDepartment,
      restrictYear,
      restrictMember,
      restrictQuantity,
    } = req.body;

    let publisherName = "N/A";
    const userId = req.session.userId;
    if (userId) {
      try {
        const member = await Members.findById(userId);
        if (member) {
          publisherName = member.name;
        }
      } catch (err) {
        console.error("Could not find publisher from session, using default. Error:", err.message);
      }
    }

    const newEvent = new Events({
      visibility: false, // 預設不可見
      imgUrl,
      title,
      hashtag,
      status,
      content,
      nonMemberPrice,
      memberPrice,
      publisher: publisherName,
      createDate: new Date(),
      eventDate: eventDate ? new Date(eventDate) : undefined,
      enrollQuantity: enrollQuantity || 0,
      restrictDepartment,
      restrictYear,
      restrictMember,
      restrictQuantity,
    });

    await newEvent.save();
    await logHistory(req, `Create event: ${title}`);
    res.status(201).json(newEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: "Failed to create event"});
  }
});

// 刪除活動 API
app.delete("/admin/events/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const deletedEvent = await Events.findByIdAndDelete(id);
    if (!deletedEvent) {
      return res.status(404).json({error: "Event not found"});
    }
    await logHistory(req, `Delete event: ${id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({error: "Failed to delete event"});
  }
});

// 取得活動列表 API
app.get("/admin/events", async (req, res) => {
  try {
    const eventsList = await Events.find({}).sort({createDate: -1});
    res.json(eventsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch events"});
  }
});

// 新增 PATCH API for event visibility
app.patch("/admin/events/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {visibility} = req.body;

    if (typeof visibility !== "boolean") {
      return res.status(400).json({error: "Invalid visibility value"});
    }

    const updatedEvent = await Events.findByIdAndUpdate(
        id,
        {visibility},
        {new: true},
    );

    if (!updatedEvent) {
      return res.status(404).json({error: "Event not found"});
    }
    await logHistory(req, `Update event visibility: ${id} to ${visibility}`);
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({error: "Failed to update event visibility"});
  }
});

// 前台取得可見活動 API
app.get("/events", async (req, res) => {
  try {
    const eventsList = await Events.find({visibility: true}).sort({createDate: -1});
    res.json(eventsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch events"});
  }
});

exports.api = functions.https.onRequest(app);
