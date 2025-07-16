const express = require("express");
const { logHistory } = require("./utils");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const Members = admin.firestore().collection("members");
const Events = admin.firestore().collection("events"); 
const Forms = admin.firestore().collection("forms");
const Responses = admin.firestore().collection("responses");
const News = admin.firestore().collection("news");
const History = admin.firestore().collection("history");

const adminRouter = express.Router();

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

adminRouter.get("/news", async (req, res) => {
  try {
    const snapshot = await News.orderBy("publishDate", "desc").get();
    const newsList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        publishDate: safeToISOString(data.publishDate),
        createDate: safeToISOString(data.createDate),
      };
    });
    res.json(newsList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch news for admin"});
  }
});

adminRouter.patch("/news/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {visibility, type, content, publishDate} = req.body;
    const updateData = {};
    if (typeof visibility === "boolean") updateData.visibility = visibility;
    if (typeof type === "string") updateData.type = type;
    if (typeof content === "string") updateData.content = content;
    if (publishDate) updateData.publishDate = new Date(publishDate);
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }
    await News.doc(id).update(updateData);
    const updatedDoc = await News.doc(id).get();
    if (!updatedDoc.exists) {
      return res.status(404).json({error: "News not found"});
    }
    const updatedNews = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      ...updatedNews,
      publishDate: safeToISOString(updatedNews.publishDate),
      createDate: safeToISOString(updatedNews.createDate),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to update news"});
  }
});

adminRouter.post("/news", async (req, res) => {
  try {
    const {type, content, publishDate, visibility} = req.body;
    if (!type || !content) {
      return res.status(400).json({error: "Type and content are required"});
    }
    let publisherName = "Unknown";
    const userId = req.userId;
    if (userId) {
      try {
        const memberDoc = await Members.doc(userId).get();
        if (memberDoc.exists) {
          const member = memberDoc.data();
          publisherName = member.name || member.displayName || "Unknown";
        }
      } catch (err) {
        console.error("Could not find publisher from session, using default. Error:", err.message);
      }
    }
    const newNewsData = {
      type,
      content,
      publisher: publisherName,
      createDate: new Date(),
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      visibility: visibility !== undefined ? visibility : true,
    };
    const newDocRef = await News.add(newNewsData);
    const newDoc = await newDocRef.get();
    const newNews = newDoc.data();
    res.status(201).json({
      _id: newDoc.id,
      ...newNews,
      publishDate: safeToISOString(newNews.publishDate),
      createDate: safeToISOString(newNews.createDate),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: "Failed to create news"});
  }
});

adminRouter.delete("/news/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await News.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({error: "News not found"});
    }
    await News.doc(id).delete();
    await logHistory(req, `Delete news: ${id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({error: "Failed to delete news"});
  }
});


adminRouter.get("/members", async (req, res) => {
  try {
    const snapshot = await Members.get();
    const membersList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        displayName: data.displayName || "",
        isActive: data.isActive || "待驗證", // string: 生效中/待驗證/未生效/已撤銷
        studentId: data.studentId || "",
        departmentYear: data.departmentYear || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        gender: data.gender || "其他",
        emailVerified: typeof data.emailVerified === "boolean" ? data.emailVerified : false,
        role: data.role,
        metadata: {
          creationTime: safeToISOString(data.metadata?.creationTime),
          lastSignInTime: safeToISOString(data.metadata?.lastSignInTime),
        },
        cumulativeConsumption: data.cumulativeConsumption || 0,
      };
    });
    res.json(membersList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch members"});
  }
});

adminRouter.post("/members", async (req, res) => {
  try {
    const {
      role,
      displayName,
      isActive,
      studentId,
      departmentYear,
      email,
      phoneNumber,
      gender,
      emailVerified,
    } = req.body;
    const newMemberData = {
      role: role || "本系會員",
      displayName: displayName || "",
      isActive: ["生效中","待驗證","未生效","已撤銷"].includes(isActive) ? isActive : "待驗證",
      studentId: studentId || "",
      departmentYear: departmentYear || "",
      email: email || "",
      phoneNumber: phoneNumber || "",
      gender: gender || "其他",
      emailVerified: typeof emailVerified === "boolean" ? emailVerified : false,
      metadata: {
        creationTime: new Date(),
        lastSignInTime: new Date(),
      },
      cumulativeConsumption: 0,
    };
    const newDocRef = await Members.add(newMemberData);
    const newDoc = await newDocRef.get();
    const newMember = newDoc.data();
    res.status(201).json({
      _id: newDoc.id,
      displayName: newMember.displayName,
      isActive: newMember.isActive,
      studentId: newMember.studentId,
      departmentYear: newMember.departmentYear,
      email: newMember.email,
      phoneNumber: newMember.phoneNumber,
      gender: newMember.gender,
      emailVerified: newMember.emailVerified,
      role: newMember.role,
      metadata: {
        creationTime: safeToISOString(newMember.metadata?.creationTime),
        lastSignInTime: safeToISOString(newMember.metadata?.lastSignInTime),
      },
      cumulativeConsumption: newMember.cumulativeConsumption,
    });
  } catch (err) {
    res.status(500).json({error: "Failed to add member"});
  }
});

adminRouter.patch("/members/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const updateDataRaw = req.body;
    const updateData = {};
    if (updateDataRaw.displayName) updateData.displayName = updateDataRaw.displayName;
    if (updateDataRaw.isActive && ["生效中","待驗證","未生效","已撤銷"].includes(updateDataRaw.isActive)) updateData.isActive = updateDataRaw.isActive;
    if (updateDataRaw.studentId) updateData.studentId = updateDataRaw.studentId;
    if (updateDataRaw.departmentYear) updateData.departmentYear = updateDataRaw.departmentYear;
    if (updateDataRaw.email) updateData.email = updateDataRaw.email;
    if (updateDataRaw.phoneNumber) updateData.phoneNumber = updateDataRaw.phoneNumber;
    if (updateDataRaw.gender) updateData.gender = updateDataRaw.gender;
    if (updateDataRaw.cumulativeConsumption) updateData.cumulativeConsumption = updateDataRaw.cumulativeConsumption;
    if (typeof updateDataRaw.emailVerified === "boolean") updateData.emailVerified = updateDataRaw.emailVerified;
    if (updateDataRaw.role) updateData.role = updateDataRaw.role;
    if (updateDataRaw.metadata) {
      if (updateDataRaw.metadata.creationTime) updateData["metadata.creationTime"] = new Date(updateDataRaw.metadata.creationTime);
      if (updateDataRaw.metadata.lastSignInTime) updateData["metadata.lastSignInTime"] = new Date(updateDataRaw.metadata.lastSignInTime);
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }
    const doc = await Members.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({error: "Member not found"});
    }
    await Members.doc(id).update(updateData);
    const updatedDoc = await Members.doc(id).get();
    const updatedData = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      displayName: updatedData.displayName,
      isActive: updatedData.isActive,
      studentId: updatedData.studentId,
      departmentYear: updatedData.departmentYear,
      email: updatedData.email,
      phoneNumber: updatedData.phoneNumber,
      gender: updatedData.gender,
      emailVerified: updatedData.emailVerified,
      role: updatedData.role,
      metadata: {
        creationTime: safeToISOString(updatedData.metadata?.creationTime),
        lastSignInTime: safeToISOString(updatedData.metadata?.lastSignInTime),
      },
      cumulativeConsumption: updatedData.cumulativeConsumption,
    });
  } catch (err) {
    console.error("Failed to update member:", err);
    res.status(500).json({error: "Failed to update member"});
  }
});

adminRouter.delete("/members/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await Members.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({error: "Member not found"});
    }
    await Members.doc(id).delete();
    await logHistory(req, `Delete member: ${id}`);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete member:", err);
    res.status(500).json({error: "Failed to delete member"});
  }
});

// HISTORY
adminRouter.get("/history", async (req, res) => {
  try {
    const snapshot = await History.orderBy("alertDate", "desc").get();
    const historyList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        alertDate: safeToISOString(data.alertDate),
      };
    });
    res.json(historyList);
  } catch (err) {
    res.status(500).json({error: "Failed to fetch history"});
  }
});

adminRouter.patch("/history/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {confirm} = req.body;
    let securityCheckerName = "Unknown";
    const userId = req.session.userId;
    if (userId) {
      try {
        const memberDoc = await Members.doc(userId).get();
        if (memberDoc.exists) {
          const member = memberDoc.data();
          securityCheckerName = member.name;
        }
      } catch (err) {
        console.error("Could not find member from session for security checker, using default. Error:", err.message);
      }
    }
    const updateData = {};
    if (typeof confirm === "boolean") {
      updateData.confirm = confirm;
      updateData.securityChecker = confirm ? securityCheckerName : "Uncheck";
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }
    await History.doc(id).update(updateData);
    const updatedDoc = await History.doc(id).get();
    if (!updatedDoc.exists) {
      return res.status(404).json({error: "History record not found"});
    }
    const updatedHistory = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      ...updatedHistory,
      alertDate: safeToISOString(updatedHistory.alertDate),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to update history"});
  }
});

// EVENTS
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
    let publisherName = "Unknown";
    const userId = req.userId;
    if (userId) {
      try {
        const memberDoc = await Members.doc(userId).get();
        if (memberDoc.exists) {
          const member = memberDoc.data();
          publisherName = member.name || member.displayName || "Unknown";
        }
      } catch (err) {
        console.error("Could not find publisher from session, using default. Error:", err.message);
      }
    }
    const newEventData = {
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
    };
    const newDocRef = await Events.add(newEventData);
    const newDoc = await newDocRef.get();
    const newEvent = newDoc.data();
    res.status(201).json({
      _id: newDoc.id,
      ...newEvent,
      createDate: safeToISOString(newEvent.createDate),
      eventDate: safeToISOString(newEvent.eventDate),
      startEnrollDate: safeToISOString(newEvent.startEnrollDate),
      endEnrollDate: safeToISOString(newEvent.endEnrollDate),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: "Failed to create event"});
  }
});

adminRouter.delete("/events/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await Events.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({error: "Event not found"});
    }
    await Events.doc(id).delete();
    await logHistory(req, `Delete event: ${id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({error: "Failed to delete event"});
  }
});

adminRouter.get("/events", async (req, res) => {
  try {
    const snapshot = await Events.orderBy("createDate", "desc").get();
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
    res.status(500).json({error: "Failed to fetch events"});
  }
});

adminRouter.patch("/events/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {
      visibility, imgUrl, title, hashtag, status, content,
      nonMemberPrice, memberPrice, eventDate, enrollQuantity,
      restrictDepartment, restrictYear, restrictMember, restrictQuantity,
      location, startEnrollDate, endEnrollDate,
    } = req.body;

    const updateData = {};
    if (typeof visibility === "boolean") updateData.visibility = visibility;
    if (typeof imgUrl === "string") updateData.imgUrl = imgUrl;
    if (typeof title === "string") updateData.title = title;
    if (typeof hashtag === "string") updateData.hashtag = hashtag;
    if (typeof status === "string") updateData.status = status;
    if (typeof content === "string") updateData.content = content;
    if (typeof nonMemberPrice !== "undefined") updateData.nonMemberPrice = nonMemberPrice;
    if (typeof memberPrice !== "undefined") updateData.memberPrice = memberPrice;
    if (eventDate) updateData.eventDate = new Date(eventDate);
    if (typeof enrollQuantity !== "undefined") updateData.enrollQuantity = enrollQuantity;
    if (typeof restrictDepartment === "string") updateData.restrictDepartment = restrictDepartment;
    if (typeof restrictYear === "string") updateData.restrictYear = restrictYear;
    if (typeof restrictMember === "boolean") updateData.restrictMember = restrictMember;
    if (typeof restrictQuantity !== "undefined") updateData.restrictQuantity = restrictQuantity;
    if (typeof location === "string") updateData.location = location;
    if (startEnrollDate) updateData.startEnrollDate = new Date(startEnrollDate);
    if (endEnrollDate) updateData.endEnrollDate = new Date(endEnrollDate);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }
    await Events.doc(id).update(updateData);
    const updatedDoc = await Events.doc(id).get();
    if (!updatedDoc.exists) {
      return res.status(404).json({error: "Event not found"});
    }
    const updatedEvent = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      ...updatedEvent,
      createDate: safeToISOString(updatedEvent.createDate),
      eventDate: safeToISOString(updatedEvent.eventDate),
      startEnrollDate: safeToISOString(updatedEvent.startEnrollDate),
      endEnrollDate: safeToISOString(updatedEvent.endEnrollDate),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to update event"});
  }
});

// FORMS
adminRouter.get("/forms", async (req, res) => {
  try {
    const formsSnap = await Forms.get();
    const forms = formsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    // 取得所有 event 與 response
    const eventsSnap = await Events.get();
    const events = eventsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const responsesSnap = await Responses.get();
    const responses = responsesSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    // eventMap: formId -> [eventTitle]
    const eventMap = {};
    events.forEach(ev => {
      if (ev.formId) {
        const key = ev.formId.toString();
        if (!eventMap[key]) eventMap[key] = [];
        eventMap[key].push(ev.title);
      }
    });
    // responseCountMap: formId -> count
    const responseCountMap = {};
    responses.forEach(rc => {
      const key = rc.formId ? rc.formId.toString() : "";
      if (!responseCountMap[key]) responseCountMap[key] = 0;
      responseCountMap[key]++;
    });
    const result = forms.map(form => ({
      _id: form._id,
      title: form.title,
      createdAt: safeToISOString(form.createdAt),
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
    // 這裡加上 eventId
    const formDocRef = await Forms.add({title, description, fields, eventId, createdAt: new Date()});
    const formDoc = await formDocRef.get();
    let eventUpdate = null;
    if (eventId) {
      await Events.doc(eventId).update({formId: formDoc.id});
      const eventDoc = await Events.doc(eventId).get();
      eventUpdate = {_id: eventDoc.id, ...eventDoc.data()};
    }
    res.status(201).json({
      form: {
        _id: formDoc.id,
        ...formDoc.data(),
        createdAt: safeToISOString(formDoc.data().createdAt),
      },
      event: eventUpdate,
    });
  } catch (err) {
    res.status(500).json({error: "Failed to create form", detail: err.message});
  }
});

adminRouter.get("/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const formDoc = await Forms.doc(id).get();
    if (!formDoc.exists) {
      return res.status(404).json({error: "Form not found"});
    }
    res.json({
      _id: formDoc.id,
      ...formDoc.data(),
      createdAt: safeToISOString(formDoc.data().createdAt),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to fetch form"});
  }
});

adminRouter.delete("/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await Forms.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({error: "Form not found"});
    }
    await Forms.doc(id).delete();
    await logHistory(req, `Delete form: ${id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({error: "Failed to delete form"});
  }
});

// ENROLLMENTS
adminRouter.get("/enrollments", async (req, res) => {
  try {
    const responsesSnap = await Responses.orderBy("createdAt", "desc").get();
    const responses = responsesSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    // 取得所有 event, form, user
    const [eventsSnap, formsSnap, membersSnap] = await Promise.all([
      Events.get(),
      Forms.get(),
      Members.get(),
    ]);
    const events = eventsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const forms = formsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const users = membersSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    // 建立查找表
    const eventMap = Object.fromEntries(events.map(e => [e._id, e]));
    const formMap = Object.fromEntries(forms.map(f => [f._id, f]));
    const userMap = Object.fromEntries(users.map(u => [u._id, u]));
    const result = responses.map(response => {
      const event = eventMap[response.activityId];
      const form = formMap[response.formId];
      const user = response.userId ? userMap[response.userId] : null;
      return {
        _id: response._id,
        eventTitle: event ? event.title : "未知活動",
        eventId: response.activityId,
        formTitle: form ? form.title : "未知表單",
        formId: response.formId,
        submittedAt: safeToISOString(response.createdAt),
        answers: response.answers,
        formSnapshot: response.formSnapshot,
        userName: user ? user.name : "匿名用戶",
        userDepartmentYear: user ? user.departmentYear : "未知",
        userEmail: user ? user.email : "未知",
        userPhone: user ? user.phoneNumber : "未知",
        memberPrice: event ? event.memberPrice : 0,
        nonMemberPrice: event ? event.nonMemberPrice : 0,
        reviewed: response.reviewed || false,
        reviewedBy: response.reviewedBy || null,
        reviewedAt: safeToISOString(response.reviewedAt),
        reviewNotes: response.reviewNotes || "",
        paymentStatus: response.paymentStatus || "未付款",
        paymentNotes: response.paymentNotes || "",
        paymentMethod: response.paymentMethod || "未指定",
      };
    });
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
        const memberDoc = await Members.doc(userId).get();
        if (memberDoc.exists) {
          const member = memberDoc.data();
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
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }
    await Responses.doc(id).update(updateData);
    const updatedDoc = await Responses.doc(id).get();
    if (!updatedDoc.exists) {
      return res.status(404).json({error: "Enrollment not found"});
    }
    const updatedResponse = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      ...updatedResponse,
      reviewedAt: safeToISOString(updatedResponse.reviewedAt),
    });
  } catch (err) {
    res.status(500).json({error: "Failed to update enrollment"});
  }
});

module.exports = { adminRouter, logHistory };
