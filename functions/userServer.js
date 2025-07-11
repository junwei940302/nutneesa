const express = require("express");
const News = require("./models/news"); // Firestore collection 物件
const Members = require("./models/members");
const Events = require("./models/events");
const Forms = require("./models/forms");
const Responses = require("./models/responses");
const { sha256 } = require("./utils");
const db = require("./firestore"); // 如果在 models 目錄下，請用 ../firestore

const userRouter = express.Router();

userRouter.get("/news", async (req, res) => {
  try {
    const snapshot = await News.where("visibility", "==", true)
      .orderBy("publishDate", "desc")
      .get();
    const newsList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        publishDate: data.publishDate && data.publishDate.toDate ? data.publishDate.toDate().toISOString() : null,
        createDate: data.createDate && data.createDate.toDate ? data.createDate.toDate().toISOString() : null,
      };
    });
    res.json(newsList);
  } catch (err) {
    console.error("Error in /news:", err); // <--- 加這行
    res.status(500).json({error: "Failed to fetch news"});
  }
});

userRouter.post("/register", async (req, res) => {
  const {email, password, memberName, studentId, gender, departmentYear, phone} = req.body;
  if (!email || !password) {
    return res.json({success: false, message: "請填寫所有欄位 / Please fill all fields."});
  }
  try {
    // Firestore: 檢查 email 是否已存在
    const existSnap = await Members.where("email", "==", email).get();
    if (!existSnap.empty) {
      return res.json({success: false, message: "Email 已註冊 / Email already registered."});
    }
    const targetRole = departmentYear && departmentYear.includes("電機") ? "本系會員" : "非本系會員";
    const hashed = sha256(password);
    const memberData = {
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
    };
    await Members.add(memberData);
    res.json({success: true, message: "註冊成功 / Register success!"});
  } catch (err) {
    res.status(500).json({success: false, message: "伺服器錯誤 / Server error."});
  }
});

userRouter.post("/login", async (req, res) => {
  const {email, password} = req.body;
  if (!email || !password) {
    return res.json({success: false, message: "請輸入帳號密碼 / Please enter email and password."});
  }
  try {
    const hashed = sha256(password);
    // Firestore: 查詢 email+password
    const memberSnap = await Members.where("email", "==", email).where("password", "==", hashed).get();
    if (memberSnap.empty) {
      return res.json({success: false, message: "帳號或密碼錯誤 / Invalid email or password."});
    }
    const memberDoc = memberSnap.docs[0];
    const member = memberDoc.data();
    const memberId = memberDoc.id;
    // Firestore: 更新 lastOnline
    await Members.doc(memberId).update({lastOnline: new Date()});
    req.session.userId = memberId;
    res.json({success: true, message: "登入成功 / Login success!", role: member.role});
  } catch (err) {
    res.status(500).json({success: false, message: "伺服器錯誤 / Server error."});
  }
});

userRouter.post("/logout", async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({success: false, message: "登出失敗 / Logout failed"});
    }
    res.clearCookie("connect.sid");
    res.json({success: true, message: "已登出 / Logged out"});
  });
});

userRouter.get("/me", async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const userId = req.session.userId;
  if (!userId) return res.json({loggedIn: false});
  try {
    // Firestore: 以 userId 查詢
    const memberDoc = await Members.doc(userId).get();
    if (!memberDoc.exists) return res.json({loggedIn: false});
    const member = memberDoc.data();
    res.json({
      loggedIn: true,
      user: {
        memberId: memberDoc.id,
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

userRouter.get("/events", async (req, res) => {
  try {
    const snapshot = await Events.where("visibility", "==", true)
      .orderBy("createDate", "desc")
      .get();
    const eventsList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        createDate: safeToISOString(data.createDate),
        eventDate: safeToISOString(data.eventDate),
        startEnrollDate: safeToISOString(data.startEnrollDate),
        endEnrollDate: safeToISOString(data.endEnrollDate),
      };
    });
    res.json(eventsList);
  } catch (err) {
    console.error("Error in /events:", err);
    res.status(500).json({error: "Failed to fetch events"});
  }
});

// 工具函數：安全轉換 Firestore 日期欄位
function safeToISOString(val) {
  if (!val) return null;
  if (val.toDate) {
    // Firestore Timestamp
    return val.toDate().toISOString();
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  // 其他型別（如 string 或 number）
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

userRouter.get("/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const formDoc = await Forms.doc(id).get();
    if (!formDoc.exists) {
      return res.status(404).json({error: "Form not found"});
    }
    const form = formDoc.data();
    res.json({
      _id: formDoc.id,
      ...form,
      createdAt: safeToISOString(form.createdAt),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to fetch form"});
  }
});

userRouter.get("/responses/check/:activityId/:formId", async (req, res) => {
  try {
    const {activityId, formId} = req.params;
    let userId = null;
    if (req.session && req.session.userId) {
      userId = req.session.userId;
    }
    let snap = await Responses
      .where("activityId", "==", activityId)
      .where("formId", "==", formId)
      .where("userId", "==", userId || null)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      res.json({
        submitted: true,
        submittedAt: safeToISOString(data.createdAt),
        message: "您已經提交過此表單",
      });
    } else {
      res.json({submitted: false});
    }
  } catch (err) {
    res.status(500).json({error: "Failed to check response status", detail: err.message});
  }
});

userRouter.post("/responses", async (req, res) => {
  try {
    const {activityId, formId, answers, formSnapshot} = req.body;
    if (!activityId || !formId || !answers) {
      return res.status(400).json({error: "Missing required fields"});
    }
    let userId = null;
    if (req.session && req.session.userId) {
      userId = req.session.userId;
    }
    // 檢查是否已經提交過
    const snap = await Responses
      .where("activityId", "==", activityId)
      .where("formId", "==", formId)
      .where("userId", "==", userId || null)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      return res.status(409).json({
        error: "您已經提交過此表單，無法重複提交",
        submittedAt: safeToISOString(data.createdAt),
      });
    }
    // 新增 response
    const responseData = {
      activityId,
      formId,
      userId,
      answers,
      formSnapshot,
      createdAt: new Date(),
    };
    const newDocRef = await Responses.add(responseData);
    const newDoc = await newDocRef.get();
    // 更新活動人數
    await Events.doc(activityId).update({enrollQuantity: db.FieldValue.increment(1)});
    res.status(201).json({
      _id: newDoc.id,
      ...newDoc.data(),
      createdAt: safeToISOString(newDoc.data().createdAt),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to submit response", detail: err.message});
  }
});

userRouter.get("/responses/user", async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({error: "User not logged in"});
    }
    const userId = req.session.userId;
    const snap = await Responses.where("userId", "==", userId).orderBy("createdAt", "desc").get();
    const responses = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const [eventsSnap, formsSnap] = await Promise.all([
      Events.get(),
      Forms.get(),
    ]);
    const events = eventsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const forms = formsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const eventMap = Object.fromEntries(events.map(e => [e._id, e]));
    const formMap = Object.fromEntries(forms.map(f => [f._id, f]));
    const result = responses.map(response => {
      const event = eventMap[response.activityId] || {};
      const form = formMap[response.formId] || {};
      return {
        _id: response._id,
        eventTitle: event.title || "未知活動",
        eventId: response.activityId || "",
        formTitle: form.title || "未知表單",
        formId: response.formId || "",
        submittedAt: safeToISOString(response.createdAt),
        answers: response.answers,
        paymentStatus: response.paymentStatus || "待確認",
        paymentMethod: response.paymentMethod || "未指定",
        amount: event ? (event.memberPrice || event.nonMemberPrice || 0) : 0,
      };
    });
    res.json(result);
  } catch (err) {
    console.error('Error in /responses/user:', err);
    res.status(500).json({error: "Failed to fetch user responses", detail: err.message});
  }
});

userRouter.post("/enrollment/confirm", async (req, res) => {
  try {
    const {eventId} = req.body;
    if (!eventId) {
      return res.status(400).json({error: "Missing eventId"});
    }
    if (!req.session || !req.session.userId) {
      return res.status(401).json({error: "User not logged in"});
    }
    const userId = req.session.userId;
    const snap = await Responses
      .where("activityId", "==", eventId)
      .where("userId", "==", userId)
      .get();
    if (snap.empty) {
      return res.status(404).json({error: "No enrollment found for this event"});
    }
    res.json({
      success: true,
      message: "報名成功！",
      eventId: eventId,
    });
  } catch (err) {
    res.status(500).json({error: "Failed to confirm enrollment", detail: err.message});
  }
});

module.exports = { userRouter }; 