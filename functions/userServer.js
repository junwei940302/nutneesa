const express = require("express");
const News = require("./models/news");
const Members = require("./models/members");
const Events = require("./models/events");
const Forms = require("./models/forms");
const Responses = require("./models/responses");
const { sha256 } = require("./utils");

const userRouter = express.Router();

userRouter.get("/news", async (req, res) => {
  try {
    const newsList = await News.find({visibility: true}).sort({publishDate: -1});
    res.json(newsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch news"});
  }
});

userRouter.post("/register", async (req, res) => {
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

userRouter.post("/login", async (req, res) => {
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

userRouter.get("/events", async (req, res) => {
  try {
    const eventsList = await Events.find({visibility: true}).sort({createDate: -1});
    res.json(eventsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch events"});
  }
});

userRouter.get("/forms/:id", async (req, res) => {
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

userRouter.get("/responses/check/:activityId/:formId", async (req, res) => {
  try {
    const {activityId, formId} = req.params;
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
    await Events.findByIdAndUpdate(
        activityId,
        {$inc: {enrollQuantity: 1}},
    );
    res.status(201).json(response);
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
    const responses = await Responses.find({userId}).sort({createdAt: -1}).lean();
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
        paymentStatus: "待確認",
        paymentMethod: "未指定",
        amount: event ? (event.memberPrice || event.nonMemberPrice || 0) : 0,
      };
    }));
    res.json(result);
  } catch (err) {
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
    const existingResponse = await Responses.findOne({
      activityId: eventId,
      userId: userId,
    });
    if (!existingResponse) {
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