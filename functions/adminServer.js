const express = require("express");
const Members = require("./models/members");
const News = require("./models/news");
const History = require("./models/history");
const Events = require("./models/events");
const Forms = require("./models/forms");
const Responses = require("./models/responses");
const { logHistory } = require("./utils");

const adminRouter = express.Router();

adminRouter.get("/news", async (req, res) => {
  try {
    const newsList = await News.find({}).sort({publishDate: -1});
    res.json(newsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch news for admin"});
  }
});

adminRouter.patch("/news/:id", async (req, res) => {
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

adminRouter.post("/news", async (req, res) => {
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

adminRouter.delete("/news/:id", async (req, res) => {
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


adminRouter.get("/members", async (req, res) => {
  try {
    const membersList = await Members.find({});
    res.json(membersList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch members"});
  }
});

adminRouter.post("/members", async (req, res) => {
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

adminRouter.delete("/members/:id", async (req, res) => {
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

adminRouter.get("/history", async (req, res) => {
  try {
    const historyList = await History.find({}).sort({alertDate: -1});
    res.json(historyList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch history"});
  }
});

adminRouter.patch("/history/:id", async (req, res) => {
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

adminRouter.post("/events", async (req, res) => {
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

adminRouter.delete("/events/:id", async (req, res) => {
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

adminRouter.get("/events", async (req, res) => {
  try {
    const eventsList = await Events.find({}).sort({createDate: -1});
    res.json(eventsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch events"});
  }
});

adminRouter.patch("/events/:id", async (req, res) => {
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

adminRouter.get("/forms", async (req, res) => {
  try {
    const forms = await Forms.find().lean();
    const events = await Events.find({formId: {$ne: null}}, {formId: 1, title: 1}).lean();
    const responseCounts = await Responses.aggregate([
      {$group: {_id: "$formId", count: {$sum: 1}}},
    ]);
    const eventMap = {};
    events.forEach((ev) => {
      if (ev.formId) {
        const key = ev.formId.toString();
        if (!eventMap[key]) eventMap[key] = [];
        eventMap[key].push(ev.title);
      }
    });
    const responseCountMap = {};
    responseCounts.forEach((rc) => {
      responseCountMap[rc._id ? rc._id.toString() : ""] = rc.count;
    });
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

adminRouter.post("/forms", async (req, res) => {
  try {
    const {title, description, fields, eventId} = req.body;
    if (!title || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({error: "Title and fields are required"});
    }
    const form = await Forms.create({title, description, fields});
    let eventUpdate = null;
    if (eventId) {
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

adminRouter.get("/forms/:id", async (req, res) => {
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

adminRouter.delete("/forms/:id", async (req, res) => {
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

adminRouter.get("/enrollments", async (req, res) => {
  try {
    const responses = await Responses.find().sort({createdAt: -1}).lean();
    const result = await Promise.all(responses.map(async (response) => {
      const event = await Events.findById(response.activityId).lean();
      const form = await Forms.findById(response.formId).lean();
      const user = response.userId ? await Members.findById(response.userId).lean() : null;
      return {
        _id: response._id,
        eventTitle: event ? event.title : "未知活動",
        eventId: response.activityId,
        formTitle: form ? form.title : "未知表單",
        formId: response.formId,
        submittedAt: response.createdAt,
        answers: response.answers,
        formSnapshot: response.formSnapshot,
        userName: user ? user.name : "匿名用戶",
        userDepartmentYear: user ? user.departmentYear : "未知",
        userEmail: user ? user.email : "未知",
        userPhone: user ? user.phone : "未知",
        memberPrice: event ? event.memberPrice : 0,
        nonMemberPrice: event ? event.nonMemberPrice : 0,
        reviewed: response.reviewed || false,
        reviewedBy: response.reviewedBy || null,
        reviewedAt: response.reviewedAt || null,
        reviewNotes: response.reviewNotes || "",
        paymentStatus: response.paymentStatus || "未付款",
        paymentNotes: response.paymentNotes || "",
        paymentMethod: response.paymentMethod || "未指定",
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch enrollments", detail: err.message});
  }
});

adminRouter.patch("/enrollments/:id", async (req, res) => {
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
    const updateData = {};
    if (typeof reviewed === "boolean") {
      updateData.reviewed = reviewed;
      updateData.reviewedBy = reviewed ? reviewerName : null;
      updateData.reviewedAt = reviewed ? new Date() : null;
      updateData.reviewNotes = reviewNotes || "";
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      updateData.paymentNotes = paymentNotes || "";
    }
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

module.exports = { adminRouter, logHistory }; 