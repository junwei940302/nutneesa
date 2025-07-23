const express = require("express");
const { sha256 } = require("./utils");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://nutneesa.firebaseio.com",
  });
}

const Members = admin.firestore().collection("members");
const Events = admin.firestore().collection("events");
const Forms = admin.firestore().collection("forms");
const Responses = admin.firestore().collection("responses");
const News = admin.firestore().collection("news");
const Maps = admin.firestore().collection("maps");
const ConferenceRecords = admin.firestore().collection("conferenceRecords");
const { sendVerificationEmail } = require("./utils");
const { verifyFirebaseToken } = require("./utils");

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
  const {email, password, studentId, gender, departmentYear} = req.body;
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
    const memberData = {
      role: targetRole,
      isActive: false,
      studentId,
      gender,
      departmentYear,
      cumulativeConsumption: 0,
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
  // 前端只要呼叫 firebase.auth().signOut() 即可
  res.json({success: true, message: "已登出 / Logged out"});
});

// 用 verifyFirebaseToken 保護需登入 API
userRouter.get("/me", verifyFirebaseToken, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const uid = req.user.uid;
  if (!uid) return res.json({loggedIn: false});
  
  try {
    console.time("FirestoreMemberQuery");
    let memberDoc;
    try {
      // Add retry logic for Firestore operation
      const maxRetries = 3;
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          memberDoc = await Members.doc(uid).get();
          break;
        } catch (err) {
          lastError = err;
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      if (!memberDoc) throw lastError;
    } finally {
      console.timeEnd("FirestoreMemberQuery");
    }
    
    if (!memberDoc.exists) return res.json({loggedIn: false});
    
    console.time("AuthUserQuery");
    let adminUser;
    try {
      // Add retry logic for auth operation
      const maxRetries = 3;
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          adminUser = await admin.auth().getUser(uid);
          break;
        } catch (err) {
          lastError = err;
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      if (!adminUser) throw lastError;
    } finally {
      console.timeEnd("AuthUserQuery");
    }

    if (!memberDoc.exists) return res.json({loggedIn: false});
    
    const member = memberDoc.data();
    const needsEmailUpdate = adminUser.emailVerified && !member.emailVerified;
    
    if (needsEmailUpdate) {
      await Members.doc(uid).update({ emailVerified: true });
      member.emailVerified = true;
    }

    res.json({
      loggedIn: true,
      user: {
        memberId: memberDoc.id,
        displayName: member.displayName,
        email: member.email,
        emailVerified: member.emailVerified,
        role: member.role,
        isActive: member.isActive,
        studentId: member.studentId || "",
        gender: member.gender || "",
        departmentYear: member.departmentYear || "",
        phoneNumber: member.phoneNumber || "",
      },
    });
  } catch (err) {
    res.status(500).json({loggedIn: false, error: "Server error"});
  }
});

userRouter.get("/maps", async (req, res) => {
  try {
    // 先嘗試獲取所有地圖，然後在代碼中過濾
    const snapshot = await Maps.get();
    const mapsList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        createDate: data.createDate && data.createDate.toDate ? data.createDate.toDate().toISOString() : null,
        updateDate: data.updateDate && data.updateDate.toDate ? data.updateDate.toDate().toISOString() : null,
      };
    });
    
    // 過濾出可見的地圖
    const visibleMaps = mapsList.filter(map => map.visibility !== false);
    
    res.json(visibleMaps);
  } catch (err) {
    console.error("Error in /maps:", err);
    res.status(500).json({error: "Failed to fetch maps", detail: err.message});
  }
});

userRouter.get('/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;

  try {
    const response = await fetch(imageUrl);
    const contentType = response.headers.get('content-type');

    res.set('Content-Type', contentType);
    response.body.pipe(res);
  } catch (error) {
    res.status(500).send('Error fetching image');
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

userRouter.get("/responses/check/:activityId/:formId", verifyFirebaseToken, async (req, res) => {
  try {
    const {activityId, formId} = req.params;
    const uid = req.user.uid;
    let snap = await Responses
      .where("activityId", "==", activityId)
      .where("formId", "==", formId)
      .where("userId", "==", uid)
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

userRouter.post("/responses", verifyFirebaseToken, async (req, res) => {
  try {
    const {activityId, formId, answers, formSnapshot} = req.body;
    if (!activityId || !formId || !answers) {
      return res.status(400).json({error: "Missing required fields"});
    }
    const uid = req.user.uid;
    // 檢查是否已經提交過
    const snap = await Responses
      .where("activityId", "==", activityId)
      .where("formId", "==", formId)
      .where("userId", "==", uid)
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
      userId: uid,
      answers,
      formSnapshot,
      createdAt: new Date(),
    };
    const newDocRef = await Responses.add(responseData);
    const newDoc = await newDocRef.get();
    // 更新活動人數
    const eventRef = Events.doc(activityId);
    await eventRef.update({
      enrollQuantity: (await eventRef.get()).data().enrollQuantity + 1,
    });
    res.status(201).json({
      _id: newDoc.id,
      ...newDoc.data(),
      createdAt: safeToISOString(newDoc.data().createdAt),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to submit response", detail: err.message});
  }
});

userRouter.get("/responses/user", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { limit = 20, offset = 0 } = req.query;
    
    // Get paginated responses
    const responsesQuery = Responses
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(Number(limit))
      .offset(Number(offset));
    
    const [responsesSnap, eventsSnap, formsSnap] = await Promise.all([
      responsesQuery.get(),
      Events.get(),
      Forms.get(),
    ]);

    const responses = responsesSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const events = eventsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const forms = formsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

    const eventMap = Object.fromEntries(events.map(e => [e._id, e]));
    const formMap = Object.fromEntries(forms.map(f => [f._id, f]));

    const result = responses.map(response => ({
      _id: response._id,
      eventTitle: eventMap[response.activityId]?.title || "未知活動",
      eventId: response.activityId || "",
      formTitle: formMap[response.formId]?.title || "未知表單",
      formId: response.formId || "",
      submittedAt: safeToISOString(response.createdAt),
      answers: response.answers,
      paymentStatus: response.paymentStatus || "待確認",
      paymentMethod: response.paymentMethod || "未指定",
      amount: eventMap[response.activityId]?.memberPrice || 
              eventMap[response.activityId]?.nonMemberPrice || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error in /responses/user:", err);
    res.status(500).json({error: "Failed to fetch user responses", detail: err.message});
  }
});

// 報名確認（需登入）
userRouter.post("/enrollment/confirm", verifyFirebaseToken, async (req, res) => {
  try {
    const {eventId} = req.body;
    if (!eventId) {
      return res.status(400).json({error: "Missing eventId"});
    }
    const userId = req.user.uid;
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

// 新增：付款資料備註 API
userRouter.post("/payments/notes", verifyFirebaseToken, async (req, res) => {
  try {
    const { eventId, paymentMethod, paymentNotes } = req.body;
    if (!eventId || !paymentMethod) {
      return res.status(400).json({ error: "Missing eventId or paymentMethod" });
    }
    const uid = req.user.uid;
    // 找到該活動的該用戶報名紀錄
    const snap = await Responses
      .where("activityId", "==", eventId)
      .where("userId", "==", uid)
      .get();
    if (snap.empty) {
      return res.status(404).json({ error: "No enrollment found for this event" });
    }
    const doc = snap.docs[0];
    // 更新付款方式與備註
    await Responses.doc(doc.id).update({
      paymentMethod,
      paymentNotes: paymentNotes || null,
      paymentStatus: paymentMethod === "現金支付" ? "待現場付款" : "轉帳待確認",
    });
    res.json({ success: true, message: "付款資料已儲存" });
  } catch (err) {
    res.status(500).json({ error: "Failed to save payment notes", detail: err.message });
  }
});

// 產生六位數驗證碼
function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 發送驗證碼 API
userRouter.post("/verify/send-code", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });
  try {
    // 查找會員
    const snap = await Members.where("email", "==", email).get();
    if (snap.empty) return res.status(404).json({ error: "User not found" });
    const doc = snap.docs[0];
    const member = doc.data();
    const code = generate6DigitCode();
    const expireAt = Date.now() + 10 * 60 * 1000; // 10 分鐘
    // 存入驗證碼與過期時間
    await Members.doc(doc.id).update({ verifyCode: code, verifyCodeExpire: expireAt });
    // 準備信件內容
    const name = member.displayName || member.name || "會員";
    const authlink = `https://nutneesa.online/verify?email=${encodeURIComponent(email)}&code=${code}`;
    const templateId = "d-a6fb3a20b25a4131851861f97a334676"; // TODO: 請換成你的 template id
    await sendVerificationEmail({ to: email, name, code, authlink, templateId });
    res.json({ success: true, message: "驗證碼已寄出 / Verification code sent." });
  } catch (err) {
    res.status(500).json({ error: "Failed to send verification code", detail: err.message });
  }
});

// 驗證驗證碼 API
userRouter.post("/verify/confirm", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Missing email or code" });
  try {
    const snap = await Members.where("email", "==", email).get();
    if (snap.empty) return res.status(404).json({ error: "User not found" });
    const doc = snap.docs[0];
    const member = doc.data();
    if (!member.verifyCode || !member.verifyCodeExpire) {
      return res.status(400).json({ error: "No verification code found" });
    }
    if (Date.now() > member.verifyCodeExpire) {
      return res.status(400).json({ error: "驗證碼已過期 / Code expired" });
    }
    if (member.verifyCode !== code) {
      return res.status(400).json({ error: "驗證碼錯誤 / Invalid code" });
    }
    await Members.doc(doc.id).update({ 
      emailVerified: true, 
      verifyCode: "completed", 
    });
    // 同步 Auth 狀態
    await admin.auth().updateUser(doc.id, { emailVerified: true });
    res.json({ success: true, message: "驗證成功 / Verification success!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify code", detail: err.message });
  }
});

userRouter.post("/recaptcha", async (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res.status(400).json({ success: false, message: "No token provided" });
  }
  const secret = process.env.RECAPTCHA_SERVER_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, message: "Server misconfiguration: missing RECAPTCHA_SERVER_SECRET" });
  }
  try {
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;
    const response = await fetch(verificationUrl, { method: "POST" });
    const data = await response.json();
    if (data.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: data["error-codes"] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "reCAPTCHA verification failed", error: err.message });
  }
});

// Conference Records API
// Get all conference records (public access)
userRouter.get("/conference-records", async (req, res) => {
  try {
    const snapshot = await ConferenceRecords
      .where("visibility", "==", true)
      .orderBy("uploadDate", "desc")
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      records.push({
        id: doc.id,
        fileName: data.fileName,
        category: data.category,
        uploadDate: safeToISOString(data.uploadDate),
        downloadUrl: data.downloadUrl,
        fileSize: data.fileSize
      });
    });
    
    res.json(records);
  } catch (err) {
    console.error("Error fetching conference records:", err);
    res.status(500).json({ error: "Failed to fetch conference records" });
  }
});

module.exports = { userRouter };
