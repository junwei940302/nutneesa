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
const mongoose = require("mongoose");
const crypto = require("crypto");
const MongoStore = require("connect-mongo");
const News = require("./models/news");
const History = require("./models/history");
const Members = require("./models/members");
// const Flows = require("./models/flows");
const Events = require("./models/events");
const Forms = require("./models/forms");
const Responses = require("./models/responses");

// 只在本地開發時載入 dotenv
if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// 取得環境變數 - Firebase Functions v2 直接使用環境變數
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing in environment variables!");
}
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
// FRONTEND_URLS 不再需要，因為我們使用 rewrites

const app = express();

// 環境變數已設定，但 CORS 由 V2 和 rewrites 處理
console.log("- MongoDB URI configured:", !!MONGODB_URI);
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
app.get("/api/news", async (req, res) => {
  try {
    const newsList = await News.find({visibility: true}).sort({publishDate: -1});
    res.json(newsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch news"});
  }
});

app.get("/api/admin/news", async (req, res) => {
  try {
    const newsList = await News.find({}).sort({publishDate: -1});
    res.json(newsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch news for admin"});
  }
});

app.patch("/api/admin/news/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const updateFields = {};
    const allowedFields = ["type", "content", "visibility"];
    // 只允許這三個欄位
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updateFields[field] = req.body[field];
      }
    });
    // 如果有 visibility 欄位，檢查型別
    if (updateFields.hasOwnProperty("visibility") && typeof updateFields.visibility !== "boolean") {
      return res.status(400).json({error: "Invalid visibility value"});
    }
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }
    const updatedNews = await News.findByIdAndUpdate(
        id,
        updateFields,
        {new: true},
    );
    if (!updatedNews) {
      return res.status(404).json({error: "News not found"});
    }
    await logHistory(req, `Update news: ${id} fields: ${Object.keys(updateFields).join(', ')}`);
    res.json(updatedNews);
  } catch (err) {
    res.status(500).json({error: "Failed to update news"});
  }
});

app.post("/api/admin/news", async (req, res) => {
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

app.delete("/api/admin/news/:id", async (req, res) => {
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
app.get("/api/admin/members", async (req, res) => {
  try {
    const membersList = await Members.find({});
    res.json(membersList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch members"});
  }
});

// 新增會員 API
app.post("/api/admin/members", async (req, res) => {
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

// 新增 PATCH API for member inline update
app.patch("/api/admin/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      "role", "name", "studentId", "gender", "email", "phone", "departmentYear", "cumulativeConsumption", "verification"
    ];
    const updateFields = {};
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updateFields[field] = req.body[field];
      }
    });
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const updatedMember = await Members.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    if (!updatedMember) {
      return res.status(404).json({ error: "Member not found" });
    }
    await logHistory(req, `Update member: ${id} fields: ${Object.keys(updateFields).join(', ')}`);
    res.json(updatedMember);
  } catch (err) {
    res.status(500).json({ error: "Failed to update member" });
  }
});

// 註銷 API
app.delete("/api/admin/members/:id", async (req, res) => {
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
app.get("/api/admin/history", async (req, res) => {
  try {
    const historyList = await History.find({}).sort({alertDate: -1}).lean();
    // 處理 content 欄位中的 id 轉換
    const result = await Promise.all(historyList.map(async (item) => {
      let newContent = item.content;
      // 嘗試識別內容格式
      // 例如: "Delete news: 665f..."、"Delete member: 665f..."、"Delete event: 665f..."、"Delete form: 665f..."
      const patterns = [
        { key: 'news', model: News, regex: /news: ([a-fA-F0-9]{24})/ },
        { key: 'member', model: Members, regex: /member: ([a-fA-F0-9]{24})/ },
        { key: 'event', model: Events, regex: /event: ([a-fA-F0-9]{24})/ },
        { key: 'form', model: Forms, regex: /form: ([a-fA-F0-9]{24})/ },
        // 新增 enrollment/payment 狀態
        { key: 'enrollment', model: require('./models/responses'), regex: /enrollment (review|payment status): ([a-fA-F0-9]{24})/ },
        // 新增 event visibility
        { key: 'eventVisibility', model: Events, regex: /event visibility: ([a-fA-F0-9]{24})/ },
      ];
      let replaced = false;
      for (const {key, model, regex} of patterns) {
        const match = item.content.match(regex);
        if (match) {
          let id = null;
          let name = null;
          if (key === 'enrollment') {
            id = match[2];
            const doc = await model.findById(id).lean();
            if (doc) {
              // 取參與者姓名
              const member = doc.userId ? await Members.findById(doc.userId).lean() : null;
              name = member ? member.name : '<已刪除的內容>';
            } else {
              name = '<已刪除的內容>';
            }
            newContent = item.content.replace(id, name);
            replaced = true;
            break;
          } else if (key === 'eventVisibility') {
            id = match[1];
            const doc = await model.findById(id).lean();
            name = doc ? (doc.title || id) : '<已刪除的內容>';
            newContent = item.content.replace(id, name);
            replaced = true;
            break;
          } else {
            id = match[1];
            if (key === 'news') {
              const doc = await model.findById(id).lean();
              name = doc ? (doc.content || doc.type || id) : '<已刪除的內容>';
            } else if (key === 'member') {
              const doc = await model.findById(id).lean();
              name = doc ? (doc.name || id) : '<已刪除的內容>';
            } else if (key === 'event') {
              const doc = await model.findById(id).lean();
              name = doc ? (doc.title || id) : '<已刪除的內容>';
            } else if (key === 'form') {
              const doc = await model.findById(id).lean();
              name = doc ? (doc.title || id) : '<已刪除的內容>';
            }
            newContent = item.content.replace(id, name);
            replaced = true;
            break;
          }
        }
      }
      // fallback: 若是 update payment status 或 enrollment review 但格式不同
      if (!replaced && /Update (enrollment review|payment status): ([a-fA-F0-9]{24})/.test(item.content)) {
        const match = item.content.match(/Update (enrollment review|payment status): ([a-fA-F0-9]{24})/);
        if (match) {
          const id = match[2];
          const Responses = require('./models/responses');
          const doc = await Responses.findById(id).lean();
          let name = '<已刪除的內容>';
          if (doc) {
            const member = doc.userId ? await Members.findById(doc.userId).lean() : null;
            name = member ? member.name : '<已刪除的內容>';
          }
          newContent = item.content.replace(id, name);
        }
      }
      // fallback: event visibility
      if (!replaced && /Update event visibility: ([a-fA-F0-9]{24})/.test(item.content)) {
        const match = item.content.match(/Update event visibility: ([a-fA-F0-9]{24})/);
        if (match) {
          const id = match[1];
          const doc = await Events.findById(id).lean();
          const name = doc ? (doc.title || id) : '<已刪除的內容>';
          newContent = item.content.replace(id, name);
        }
      }
      return { ...item, content: newContent };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch history"});
  }
});

app.patch("/api/admin/history/:id", async (req, res) => {
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
app.post("/api/register", async (req, res) => {
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
app.post("/api/login", async (req, res) => {
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
app.post("/api/logout", async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({success: false, message: "登出失敗 / Logout failed"});
    }
    res.clearCookie("connect.sid");
    res.json({success: true, message: "已登出 / Logged out"});
  });
});

// 新增 /api/me API，回傳登入狀態
app.get("/api/me", async (req, res) => {
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
app.post("/api/admin/events", async (req, res) => {
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
      location,
      startEnrollDate,
      endEnrollDate,
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
      location,
      startEnrollDate: startEnrollDate ? new Date(startEnrollDate) : undefined,
      endEnrollDate: endEnrollDate ? new Date(endEnrollDate) : undefined,
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
app.delete("/api/admin/events/:id", async (req, res) => {
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
app.get("/api/admin/events", async (req, res) => {
  try {
    const eventsList = await Events.find({}).sort({createDate: -1});
    res.json(eventsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch events"});
  }
});

// 新增 PATCH API for event inline update
app.patch("/api/admin/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      "title", "hashtag", "status", "content", "nonMemberPrice", "memberPrice", "eventDate", "startEnrollDate", "endEnrollDate", "location", "restrictDepartment", "restrictYear", "restrictMember", "restrictQuantity"
    ];
    const updateFields = {};
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updateFields[field] = req.body[field];
      }
    });
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const updatedEvent = await Events.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    if (!updatedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }
    await logHistory(req, `Update event: ${id} fields: ${Object.keys(updateFields).join(', ')}`);
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: "Failed to update event" });
  }
});

// 前台取得可見活動 API
app.get("/api/events", async (req, res) => {
  try {
    const eventsList = await Events.find({visibility: true}).sort({createDate: -1});
    res.json(eventsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch events"});
  }
});

// 取得所有表單（含關聯活動與填寫人數）
app.get("/api/admin/forms", async (req, res) => {
  try {
    // 取得所有表單
    const forms = await Forms.find().lean();
    // 取得所有活動（只取 formId, title）
    const events = await Events.find({formId: {$ne: null}}, {formId: 1, title: 1}).lean();
    // 取得所有 responses 的 formId 統計
    const responseCounts = await Responses.aggregate([
      {$group: {_id: "$formId", count: {$sum: 1}}},
    ]);
    // 整理 event map: formId -> [活動標題...]
    const eventMap = {};
    events.forEach((ev) => {
      if (ev.formId) {
        const key = ev.formId.toString();
        if (!eventMap[key]) eventMap[key] = [];
        eventMap[key].push(ev.title);
      }
    });
    // 整理 responseCount map
    const responseCountMap = {};
    responseCounts.forEach((rc) => {
      responseCountMap[rc._id ? rc._id.toString() : ""] = rc.count;
    });
    // 組合回傳
    const result = forms.map((form) => ({
      _id: form._id,
      title: form.title,
      createdAt: form.createdAt,
      eventTitles: eventMap[form._id.toString()] || [],
      responseCount: responseCountMap[form._id.toString()] || 0,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch forms"});
  }
});

// 建立新表單，並可直接關聯活動
app.post("/api/admin/forms", async (req, res) => {
  try {
    const {title, description, fields, eventId} = req.body;
    if (!title || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({error: "Title and fields are required"});
    }
    // 建立表單
    const form = await Forms.create({title, description, fields});
    let eventUpdate = null;
    if (eventId) {
      // 更新活動的 formId
      eventUpdate = await Events.findByIdAndUpdate(
          eventId,
          {formId: form._id},
          {new: true},
      );
    }
    res.status(201).json({form, event: eventUpdate});
  } catch (err) {
    res.status(500).json({error: "Failed to create form", detail: err.message});
  }
});

// 根據 ID 取得表單資料（管理員用）
app.get("/api/admin/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const form = await Forms.findById(id).lean();
    if (!form) {
      return res.status(404).json({error: "Form not found"});
    }
    // 查詢關聯活動標題
    let eventTitles = [];
    if (form.eventId) {
      const event = await Events.findById(form.eventId).lean();
      if (event && event.title) eventTitles = [event.title];
    }
    res.json({ ...form, eventTitles });
  } catch (err) {
    res.status(500).json({error: "Failed to fetch form"});
  }
});

// 刪除表單
app.delete("/api/admin/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const deletedForm = await Forms.findByIdAndDelete(id);
    if (!deletedForm) {
      return res.status(404).json({error: "Form not found"});
    }
    await logHistory(req, `Delete form: ${id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({error: "Failed to delete form"});
  }
});

// 根據 ID 取得表單資料
app.get("/api/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const form = await Forms.findById(id);
    if (!form) {
      return res.status(404).json({error: "Form not found"});
    }
    res.json(form);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch form"});
  }
});

// 檢查用戶是否已提交過表單
app.get("/api/responses/check/:activityId/:formId", async (req, res) => {
  try {
    const {activityId, formId} = req.params;

    // 取得當前用戶 ID（如果已登入）
    let userId = null;
    if (req.session && req.session.userId) {
      userId = req.session.userId;
    }

    const existingResponse = await Responses.findOne({
      activityId,
      formId,
      userId: userId || null,
    });

    if (existingResponse) {
      res.json({
        submitted: true,
        submittedAt: existingResponse.createdAt,
        message: "您已經提交過此表單",
      });
    } else {
      res.json({submitted: false});
    }
  } catch (err) {
    res.status(500).json({error: "Failed to check response status", detail: err.message});
  }
});

// 提交表單回應
app.post("/api/responses", async (req, res) => {
  try {
    const {activityId, formId, answers, formSnapshot} = req.body;

    if (!activityId || !formId || !answers) {
      return res.status(400).json({error: "Missing required fields"});
    }

    // 取得當前用戶 ID（如果已登入）
    let userId = null;
    if (req.session && req.session.userId) {
      userId = req.session.userId;
    }

    // 檢查是否已經提交過此表單
    const existingResponse = await Responses.findOne({
      activityId,
      formId,
      userId: userId || null,
    });

    if (existingResponse) {
      return res.status(409).json({
        error: "您已經提交過此表單，無法重複提交",
        submittedAt: existingResponse.createdAt,
      });
    }

    const response = await Responses.create({
      activityId,
      formId,
      userId,
      answers,
      formSnapshot,
    });

    // 更新活動的報名人數
    await Events.findByIdAndUpdate(
        activityId,
        {$inc: {enrollQuantity: 1}},
    );

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({error: "Failed to submit response", detail: err.message});
  }
});

// 獲取用戶報名記錄
app.get("/api/responses/user", async (req, res) => {
  try {
    // 檢查用戶是否已登入
    if (!req.session || !req.session.userId) {
      return res.status(401).json({error: "User not logged in"});
    }

    const userId = req.session.userId;

    // 獲取用戶的所有報名記錄
    const responses = await Responses.find({userId}).sort({createdAt: -1}).lean();

    // 獲取相關的活動和表單資訊
    const result = await Promise.all(responses.map(async (response) => {
      const event = await Events.findById(response.activityId).lean();
      const form = await Forms.findById(response.formId).lean();

      return {
        _id: response._id,
        eventTitle: event ? event.title : "未知活動",
        eventId: response.activityId,
        formTitle: form ? form.title : "未知表單",
        formId: response.formId,
        submittedAt: response.createdAt,
        answers: response.answers,
        paymentStatus: response.paymentStatus || "未付款",
        paymentMethod: response.paymentMethod || "未指定",
        paymentNotes: response.paymentNotes || "",
        amount: event ? (event.memberPrice || event.nonMemberPrice || 0) : 0,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch user responses", detail: err.message});
  }
});

// 確認報名成功
app.post("/api/enrollment/confirm", async (req, res) => {
  try {
    const {eventId} = req.body;

    if (!eventId) {
      return res.status(400).json({error: "Missing eventId"});
    }

    // 檢查用戶是否已登入
    if (!req.session || !req.session.userId) {
      return res.status(401).json({error: "User not logged in"});
    }

    const userId = req.session.userId;

    // 檢查用戶是否已經提交過此活動的表單
    const existingResponse = await Responses.findOne({
      activityId: eventId,
      userId: userId,
    });

    if (!existingResponse) {
      return res.status(404).json({error: "No enrollment found for this event"});
    }

    // 這裡可以添加其他邏輯，比如更新付款狀態等
    // 目前只是確認報名成功，返回成功訊息

    res.json({
      success: true,
      message: "報名成功！",
      eventId: eventId,
    });
  } catch (err) {
    res.status(500).json({error: "Failed to confirm enrollment", detail: err.message});
  }
});

// 獲取所有活動報名記錄（管理員用）
app.get("/api/admin/enrollments", async (req, res) => {
  try {
    // 獲取所有報名記錄，並關聯用戶、活動和表單資訊
    const responses = await Responses.find().sort({createdAt: -1}).lean();

    const result = await Promise.all(responses.map(async (response) => {
      const event = await Events.findById(response.activityId).lean();
      const form = await Forms.findById(response.formId).lean();
      const user = response.userId ? await Members.findById(response.userId).lean() : null;

      // 付款方式優先順序：answers['paymentMethod'] > answers['payments'] > response.paymentMethod > '未指定'
      let paymentMethod =
        (response.answers && (response.answers['paymentMethod'] || response.answers['payments'])) ||
        response.paymentMethod ||
        "未指定";

      return {
        _id: response._id,
        eventTitle: event ? event.title : "未知活動",
        eventId: response.activityId,
        formTitle: form ? form.title : "未知表單",
        formId: response.formId,
        submittedAt: response.createdAt,
        answers: response.answers,
        formSnapshot: response.formSnapshot,
        // 用戶資訊
        userName: user ? user.name : "匿名用戶",
        userDepartmentYear: user ? user.departmentYear : "未知",
        userEmail: user ? user.email : "未知",
        userPhone: user ? user.phone : "未知",
        // 活動資訊
        memberPrice: event ? event.memberPrice : 0,
        nonMemberPrice: event ? event.nonMemberPrice : 0,
        // 審核狀態
        reviewed: response.reviewed || false,
        reviewedBy: response.reviewedBy || null,
        reviewedAt: response.reviewedAt || null,
        reviewNotes: response.reviewNotes || "",
        // 付款狀態
        paymentStatus: response.paymentStatus || "未付款",
        paymentNotes: response.paymentNotes || "",
        paymentMethod,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch enrollments", detail: err.message});
  }
});

// 更新報名審核狀態
app.patch("/api/admin/enrollments/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {reviewed, reviewNotes, paymentStatus, paymentNotes} = req.body;

    let reviewerName = "Unknown";
    const userId = req.session.userId;
    if (userId) {
      try {
        const member = await Members.findById(userId);
        if (member) {
          reviewerName = member.name;
        }
      } catch (err) {
        console.error("Could not find reviewer from session, using default. Error:", err.message);
      }
    }

    // 準備更新資料
    const updateData = {};

    // 如果有審核狀態更新
    if (typeof reviewed === "boolean") {
      updateData.reviewed = reviewed;
      updateData.reviewedBy = reviewed ? reviewerName : null;
      updateData.reviewedAt = reviewed ? new Date() : null;
      updateData.reviewNotes = reviewNotes || "";
    }

    // 如果有付款狀態更新
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      updateData.paymentNotes = paymentNotes || "";
    }

    // 更新報名記錄
    const updatedResponse = await Responses.findByIdAndUpdate(
        id,
        updateData,
        {new: true},
    );

    if (!updatedResponse) {
      return res.status(404).json({error: "Enrollment not found"});
    }

    if (typeof reviewed === "boolean") {
      await logHistory(req, `Update enrollment review: ${id} to ${reviewed}`);
    }
    if (paymentStatus) {
      await logHistory(req, `Update payment status: ${id} to ${paymentStatus}`);
    }

    res.json(updatedResponse);
  } catch (err) {
    res.status(500).json({error: "Failed to update enrollment"});
  }
});

// 新增：更新 paymentNotes（現金/銀行轉帳資料）
app.post("/api/payments/notes", async (req, res) => {
  try {
    const { eventId, paymentNotes, paymentMethod } = req.body;

    if (!eventId || !paymentMethod) {
      return res.status(400).json({ error: "Missing eventId or paymentMethod" });
    }

    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const userId = req.session.userId;

    const response = await Responses.findOne({
      activityId: eventId,
      userId: userId,
    });

    if (!response) {
      return res.status(404).json({ error: "No enrollment found for this event" });
    }

    response.paymentMethod = paymentMethod;
    if (paymentMethod === "轉帳" && paymentNotes) {
      // paymentNotes 應為 { bankCode, bankName, account }
      let formattedNotes = "";
      if (typeof paymentNotes === "object" && paymentNotes.bankCode && paymentNotes.bankName && paymentNotes.account) {
        formattedNotes = `${paymentNotes.bankCode} ${paymentNotes.bankName}｜${paymentNotes.account}`;
      } else if (typeof paymentNotes === "string") {
        // 若前端傳來已經是格式化字串
        formattedNotes = paymentNotes;
      }
      response.paymentNotes = formattedNotes;
      response.paymentStatus = "待確認";
    } else if (paymentMethod === "現金支付") {
      response.paymentNotes = "現金支付";
      response.paymentStatus = "待確認";
    }
    await response.save();

    res.json({ success: true, message: "付款資料已更新", paymentMethod: response.paymentMethod, paymentNotes: response.paymentNotes, paymentStatus: response.paymentStatus });
  } catch (err) {
    res.status(500).json({ error: "Failed to update payment notes", detail: err.message });
  }
});

// 新增 PATCH API for form inline update
app.patch("/api/admin/forms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ["title", "description", "fields", "eventId"];
    const updateFields = {};
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updateFields[field] = req.body[field];
      }
    });
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const updatedForm = await Forms.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    if (!updatedForm) {
      return res.status(404).json({ error: "Form not found" });
    }
    await logHistory(req, `Update form: ${id} fields: ${Object.keys(updateFields).join(', ')}`);
    res.json(updatedForm);
  } catch (err) {
    res.status(500).json({ error: "Failed to update form" });
  }
});

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
