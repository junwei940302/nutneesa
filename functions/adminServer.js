const express = require("express");
const { logHistory, firebaseAuthMiddleware, validateStudentId, getDepartmentAndYear } = require("./utils");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();
const fetch = require("node-fetch");

const Members = admin.firestore().collection("members");
const Events = admin.firestore().collection("events");
const Forms = admin.firestore().collection("forms");
const Responses = admin.firestore().collection("responses");
const News = admin.firestore().collection("news");
const History = admin.firestore().collection("history");
const Maps = admin.firestore().collection("maps");
const ConferenceRecords = admin.firestore().collection("conferenceRecords");

const adminRouter = express.Router();

// Helper to get user's name for logging/authorship.
const getExecutorName = async (uid) => {
    if (!uid) return "Unknown";
    try {
        const memberDoc = await Members.doc(uid).get();
        if (memberDoc.exists) {
            const member = memberDoc.data();
            return member.displayName || member.name || "Unknown User";
        }
        const authUser = await admin.auth().getUser(uid);
        return authUser.displayName || authUser.email || "Unknown Auth User";
    } catch (err) {
        console.error(`Could not find name for user ${uid}. Error:`, err.message);
        return "Unknown";
    }
};

// Utility function to safely convert dates to ISO strings
function safeToISOString(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// --- NEWS ---
adminRouter.get("/news", async (req, res) => {
  try {
    const snapshot = await News.orderBy("publishDate", "desc").get();
    const newsList = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data(),
        publishDate: safeToISOString(doc.data().publishDate),
        createDate: safeToISOString(doc.data().createDate),
    }));
    res.json(newsList);
  } catch (err) {
    console.error("Failed to fetch news for admin:", err);
    res.status(500).json({error: "Failed to fetch news for admin"});
  }
});

adminRouter.post("/news", async (req, res) => {
  try {
    const {type, content, publishDate, visibility} = req.body;
    if (!type || !content) {
      return res.status(400).json({error: "Type and content are required"});
    }

    const publisherName = await getExecutorName(req.user.uid);

    const newNewsData = {
      type,
      content,
      publisher: publisherName,
      publisherId: req.user.uid,
      createDate: new Date(),
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      visibility: visibility !== undefined ? visibility : true,
    };
    const newDocRef = await News.add(newNewsData);
    await logHistory(req, `Created news item: ${newDocRef.id}`);

    const newDoc = await newDocRef.get();
    const newNews = newDoc.data();
    res.status(201).json({
      _id: newDoc.id,
      ...newNews,
      publishDate: safeToISOString(newNews.publishDate),
      createDate: safeToISOString(newNews.createDate),
    });
  } catch (err) {
    console.error("Failed to create news:", err);
    res.status(500).json({error: "Failed to create news"});
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
    await logHistory(req, `Updated news item: ${id}`);

    const updatedDoc = await News.doc(id).get();
    if (!updatedDoc.exists) return res.status(404).json({error: "News not found"});

    const updatedNews = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      ...updatedNews,
      publishDate: safeToISOString(updatedNews.publishDate),
      createDate: safeToISOString(updatedNews.createDate),
    });
  } catch (err) {
    console.error("Failed to update news:", err);
    res.status(500).json({error: "Failed to update news"});
  }
});

adminRouter.delete("/news/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await News.doc(id).get();
    if (!doc.exists) return res.status(404).json({error: "News not found"});

    await News.doc(id).delete();
    await logHistory(req, `Deleted news item: ${id}`);

    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete news:", err);
    res.status(500).json({error: "Failed to delete news"});
  }
});


// --- MEMBERS ---
adminRouter.get("/members", async (req, res) => {
  try {
    const snapshot = await Members.get();
    const membersList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        displayName: data.displayName || "",
        isActive: data.isActive || "待驗證",
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
    console.error("Failed to fetch members:", err);
    res.status(500).json({error: "Failed to fetch members"});
  }
});

adminRouter.post("/members", async (req, res) => {
  try {
    const { role, displayName, isActive, studentId, departmentYear, email, phoneNumber, gender, emailVerified } = req.body;
    // Note: This creates a member record in Firestore but not in Firebase Auth.
    // This is for manual additions from the admin panel.
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
        lastSignInTime: null,
      },
      cumulativeConsumption: 0,
    };
    const newDocRef = await Members.add(newMemberData);
    await logHistory(req, `Manually added member: ${newDocRef.id} (${email})`);

    const newDoc = await newDocRef.get();
    const newMember = newDoc.data();
    res.status(201).json({
      _id: newDoc.id,
      ...newMember,
      metadata: {
        creationTime: safeToISOString(newMember.metadata?.creationTime),
        lastSignInTime: safeToISOString(newMember.metadata?.lastSignInTime),
      },
    });
  } catch (err) {
    console.error("Failed to add member:", err);
    res.status(500).json({error: "Failed to add member"});
  }
});

adminRouter.patch("/members/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const updateDataRaw = req.body;
    const updateData = {};
    // This creates a whitelist of updatable fields.
    const allowedFields = ["displayName", "isActive", "studentId", "departmentYear", "email", "phoneNumber", "gender", "role", "cumulativeConsumption"];
    allowedFields.forEach(field => {
        if (updateDataRaw[field] !== undefined) {
            updateData[field] = updateDataRaw[field];
        }
    });
    if (typeof updateDataRaw.emailVerified === "boolean") {
        updateData.emailVerified = updateDataRaw.emailVerified;
    }
    if (updateDataRaw.metadata) {
      if (updateDataRaw.metadata.creationTime) updateData["metadata.creationTime"] = new Date(updateDataRaw.metadata.creationTime);
      if (updateDataRaw.metadata.lastSignInTime) updateData["metadata.lastSignInTime"] = new Date(updateDataRaw.metadata.lastSignInTime);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }

    await Members.doc(id).update(updateData);
    await logHistory(req, `Updated member: ${id}`);

    const updatedDoc = await Members.doc(id).get();
    if (!updatedDoc.exists) return res.status(404).json({error: "Member not found"});

    const updatedData = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      ...updatedData,
       metadata: {
        creationTime: safeToISOString(updatedData.metadata?.creationTime),
        lastSignInTime: safeToISOString(updatedData.metadata?.lastSignInTime),
      },
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
    if (!doc.exists) return res.status(404).json({error: "Member not found"});

    const memberEmail = doc.data().email || "Unknown Email";
    await Members.doc(id).delete();

    try {
      await admin.auth().deleteUser(id);
    } catch (authErr) {
      if (authErr.code !== "auth/user-not-found") {
        console.error(`Failed to delete Firebase Auth user ${id}:`, authErr);
      }
    }
    
    await logHistory(req, `Deleted member: ${id} (${memberEmail})`);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete member:", err);
    res.status(500).json({error: "Failed to delete member"});
  }
});

// --- HISTORY ---
adminRouter.get("/history", async (req, res) => {
  try {
    const snapshot = await History.orderBy("alertDate", "desc").get();
    const historyList = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data(),
        alertDate: safeToISOString(doc.data().alertDate),
    }));
    res.json(historyList);
  } catch (err) {
    console.error("Failed to fetch history:", err);
    res.status(500).json({error: "Failed to fetch history"});
  }
});

adminRouter.patch("/history/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {confirm} = req.body;

    if (typeof confirm !== 'boolean') {
        return res.status(400).json({error: "Invalid 'confirm' field."});
    }

    const securityCheckerName = await getExecutorName(req.user.uid);
    const updateData = {
      confirm,
      securityChecker: confirm ? securityCheckerName : null,
      securityCheckerId: confirm ? req.user.uid : null,
    };

    await History.doc(id).update(updateData);
    await logHistory(req, `Set history event ${id} confirmation to ${confirm}`);

    const updatedDoc = await History.doc(id).get();
    if (!updatedDoc.exists) return res.status(404).json({error: "History record not found"});

    res.json({
      _id: updatedDoc.id,
      ...updatedDoc.data(),
      alertDate: safeToISOString(updatedDoc.data().alertDate),
    });
  } catch (err) {
    console.error("Failed to update history:", err);
    res.status(500).json({error: "Failed to update history"});
  }
});

// --- EVENTS ---
adminRouter.get("/events", async (req, res) => {
    try {
        const snapshot = await Events.orderBy("createDate", "desc").get();
        const eventsList = snapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data(),
            createDate: safeToISOString(doc.data().createDate),
            eventDate: safeToISOString(doc.data().eventDate),
            startEnrollDate: safeToISOString(doc.data().startEnrollDate),
            endEnrollDate: safeToISOString(doc.data().endEnrollDate),
        }));
        res.json(eventsList);
    } catch (err) {
        console.error("Failed to fetch events:", err);
        res.status(500).json({error: "Failed to fetch events"});
    }
});

adminRouter.post("/events", async (req, res) => {
  try {
    const {
      imgUrl, title, hashtag, status, content, nonMemberPrice, memberPrice,
      eventDate, enrollQuantity, restrictDepartment, restrictYear,
      restrictMember, restrictQuantity, location, startEnrollDate, endEnrollDate
    } = req.body;

    const publisherName = await getExecutorName(req.user.uid);

    const newEventData = {
      imgUrl, title, hashtag, status, content, nonMemberPrice, memberPrice,
      eventDate: eventDate ? new Date(eventDate) : null,
      enrollQuantity: enrollQuantity || 0,
      restrictDepartment, restrictYear, restrictMember, restrictQuantity,
      location,
      startEnrollDate: startEnrollDate ? new Date(startEnrollDate) : null,
      endEnrollDate: endEnrollDate ? new Date(endEnrollDate) : null,
      publisher: publisherName,
      publisherId: req.user.uid,
      createDate: new Date(),
      visibility: false,
    };

    const newDocRef = await Events.add(newEventData);
    await logHistory(req, `Created event: ${newDocRef.id} (${title})`);

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
    console.error("Failed to create event:", err);
    res.status(500).json({error: "Failed to create event"});
  }
});

adminRouter.patch("/events/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const updateDataRaw = req.body;
    const updateData = {};
    const allowedFields = [
        "visibility", "imgUrl", "title", "hashtag", "status", "content",
        "nonMemberPrice", "memberPrice", "enrollQuantity", "restrictDepartment",
        "restrictYear", "restrictMember", "restrictQuantity", "location"
    ];
    allowedFields.forEach(field => {
        if (updateDataRaw[field] !== undefined) {
            updateData[field] = updateDataRaw[field];
        }
    });
    const dateFields = ["eventDate", "startEnrollDate", "endEnrollDate"];
    dateFields.forEach(field => {
        if (updateDataRaw[field]) {
            updateData[field] = new Date(updateDataRaw[field]);
        }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }

    await Events.doc(id).update(updateData);
    await logHistory(req, `Updated event: ${id}`);

    const updatedDoc = await Events.doc(id).get();
    if (!updatedDoc.exists) return res.status(404).json({error: "Event not found"});

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
    console.error("Failed to update event:", err);
    res.status(500).json({error: "Failed to update event"});
  }
});

adminRouter.delete("/events/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await Events.doc(id).get();
    if (!doc.exists) return res.status(404).json({error: "Event not found"});

    await Events.doc(id).delete();
    await logHistory(req, `Deleted event: ${id} (${doc.data().title})`);

    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete event:", err);
    res.status(500).json({error: "Failed to delete event"});
  }
});

// --- FORMS ---
adminRouter.get("/forms", async (req, res) => {
    try {
        const [formsSnap, eventsSnap, responsesSnap] = await Promise.all([
            Forms.orderBy("createdAt", "desc").get(),
            Events.get(),
            Responses.get()
        ]);

        const forms = formsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        const events = eventsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        const responses = responsesSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

        const eventMap = events.reduce((acc, ev) => {
            if (ev.formId) {
                const key = ev.formId.toString();
                if (!acc[key]) acc[key] = [];
                acc[key].push(ev.title);
            }
            return acc;
        }, {});

        const responseCountMap = responses.reduce((acc, rc) => {
            const key = rc.formId ? rc.formId.toString() : "";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const result = forms.map(form => ({
            _id: form._id,
            title: form.title,
            createdAt: safeToISOString(form.createdAt),
            eventTitles: eventMap[form._id.toString()] || [],
            responseCount: responseCountMap[form._id.toString()] || 0,
        }));
        res.json(result);
    } catch (err) {
        console.error("Failed to fetch forms:", err);
        res.status(500).json({error: "Failed to fetch forms"});
    }
});

adminRouter.post("/forms", async (req, res) => {
  try {
    const {title, description, fields, eventId} = req.body;
    if (!title || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({error: "Title and fields are required"});
    }

    const formDocRef = await Forms.add({title, description, fields, eventId, createdAt: new Date()});
    await logHistory(req, `Created form: ${formDocRef.id} (${title})`);

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
    console.error("Failed to create form:", err);
    res.status(500).json({error: "Failed to create form", detail: err.message});
  }
});

adminRouter.get("/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const formDoc = await Forms.doc(id).get();
    if (!formDoc.exists) return res.status(404).json({error: "Form not found"});

    res.json({
      _id: formDoc.id,
      ...formDoc.data(),
      createdAt: safeToISOString(formDoc.data().createdAt),
    });
  } catch (err) {
    console.error("Failed to fetch form:", err);
    res.status(500).json({error: "Failed to fetch form"});
  }
});

adminRouter.delete("/forms/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await Forms.doc(id).get();
    if (!doc.exists) return res.status(404).json({error: "Form not found"});

    await Forms.doc(id).delete();
    await logHistory(req, `Deleted form: ${id} (${doc.data().title})`);

    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete form:", err);
    res.status(500).json({error: "Failed to delete form"});
  }
});

// --- ENROLLMENTS ---
adminRouter.get("/enrollments", async (req, res) => {
  try {
    const [responsesSnap, eventsSnap, formsSnap, membersSnap] = await Promise.all([
      Responses.orderBy("createdAt", "desc").get(),
      Events.get(),
      Forms.get(),
      Members.get(),
    ]);

    const events = Object.fromEntries(eventsSnap.docs.map(doc => [doc.id, doc.data()]));
    const forms = Object.fromEntries(formsSnap.docs.map(doc => [doc.id, doc.data()]));
    const users = Object.fromEntries(membersSnap.docs.map(doc => [doc.id, doc.data()]));

    const result = responsesSnap.docs.map(doc => {
        const response = doc.data();
        const event = events[response.activityId];
        const form = forms[response.formId];
        const user = users[response.userId];
        return {
            _id: doc.id,
            eventTitle: event?.title || "Unknown Event",
            eventId: response.activityId,
            formTitle: form?.title || "Unknown Form",
            formId: response.formId,
            submittedAt: safeToISOString(response.createdAt),
            answers: response.answers,
            formSnapshot: response.formSnapshot,
            userName: user?.displayName || user?.name || "Anonymous",
            userDepartmentYear: user?.departmentYear || "Unknown",
            userEmail: user?.email || "Unknown",
            userPhone: user?.phoneNumber || "Unknown",
            memberPrice: event?.memberPrice || 0,
            nonMemberPrice: event?.nonMemberPrice || 0,
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
    console.error("Failed to fetch enrollments:", err);
    res.status(500).json({error: "Failed to fetch enrollments", detail: err.message});
  }
});

adminRouter.patch("/enrollments/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {reviewed, reviewNotes, paymentStatus, paymentNotes} = req.body;

    const reviewerName = await getExecutorName(req.user.uid);

    const updateData = {};
    if (typeof reviewed === "boolean") {
      updateData.reviewed = reviewed;
      updateData.reviewedBy = reviewed ? reviewerName : null;
      updateData.reviewedById = reviewed ? req.user.uid : null;
      updateData.reviewedAt = reviewed ? new Date() : null;
      updateData.reviewNotes = reviewNotes || "";
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    if (paymentNotes !== undefined) {
        updateData.paymentNotes = paymentNotes;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }

    await Responses.doc(id).update(updateData);
    await logHistory(req, `Updated enrollment ${id}: ${JSON.stringify(updateData)}`);

    const updatedDoc = await Responses.doc(id).get();
    if (!updatedDoc.exists) return res.status(404).json({error: "Enrollment not found"});

    res.json({
      _id: updatedDoc.id,
      ...updatedDoc.data(),
      reviewedAt: safeToISOString(updatedDoc.data().reviewedAt),
    });
  } catch (err) {
    console.error("Failed to update enrollment:", err);
    res.status(500).json({error: "Failed to update enrollment"});
  }
});

// --- MAPS ---
adminRouter.get("/maps", async (req, res) => {
  try {
    const snapshot = await Maps.orderBy("category").get();
    const mapsList = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data(),
        createDate: safeToISOString(doc.data().createDate),
        updateDate: safeToISOString(doc.data().updateDate),
    }));
    res.json(mapsList);
  } catch (err) {
    console.error("Failed to fetch maps:", err);
    res.status(500).json({error: "Failed to fetch maps"});
  }
});

adminRouter.post("/maps", async (req, res) => {
  try {
    const {name, category, description, placeId, menuUrl, openingHours, phone, longitude, latitude, website, image, formattedAddress} = req.body;
    if (!category || !description || !placeId) {
      return res.status(400).json({error: "Category, description, and Place ID are required"});
    }
    const newMapData = {
      name: name || "", category, description, placeId,
      formattedAddress: formattedAddress || "",
      menuUrl: menuUrl || "",
      openingHours: openingHours || "",
      phone: phone || "",
      longitude: longitude || null,
      latitude: latitude || null,
      website: website || "",
      image: image || "",
      createDate: new Date(),
      updateDate: new Date(),
    };
    const newDocRef = await Maps.add(newMapData);
    await logHistory(req, `Created map item: ${newDocRef.id} (${name})`);

    const newDoc = await newDocRef.get();
    const newMap = newDoc.data();
    res.status(201).json({
      _id: newDoc.id,
      ...newMap,
      createDate: safeToISOString(newMap.createDate),
      updateDate: safeToISOString(newMap.updateDate),
    });
  } catch (err) {
    console.error("Failed to create map item:", err);
    res.status(500).json({error: "Failed to create map item"});
  }
});

adminRouter.patch("/maps/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const updateDataRaw = req.body;
    const updateData = {};
    const allowedFields = [
        "name", "category", "description", "formattedAddress", "googleMapUrl",
        "menuUrl", "photoUrl", "openingHours", "phone", "longitude",
        "latitude", "website", "image"
    ];
    allowedFields.forEach(field => {
        if(updateDataRaw[field] !== undefined) {
            updateData[field] = updateDataRaw[field];
        }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({error: "No valid fields to update"});
    }
    updateData.updateDate = new Date();

    await Maps.doc(id).update(updateData);
    await logHistory(req, `Updated map item: ${id}`);

    const updatedDoc = await Maps.doc(id).get();
    if (!updatedDoc.exists) return res.status(404).json({error: "Map item not found"});

    const updatedData = updatedDoc.data();
    res.json({
      _id: updatedDoc.id,
      ...updatedData,
      createDate: safeToISOString(updatedData.createDate),
      updateDate: safeToISOString(updatedData.updateDate),
    });
  } catch (err) {
    console.error("Failed to update map item:", err);
    res.status(500).json({error: "Failed to update map item"});
  }
});

adminRouter.delete("/maps/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const doc = await Maps.doc(id).get();
    if (!doc.exists) return res.status(404).json({error: "Map item not found"});

    await Maps.doc(id).delete();
    await logHistory(req, `Deleted map item: ${id} (${doc.data().name})`);

    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete map item:", err);
    res.status(500).json({error: "Failed to delete map item"});
  }
});

// --- GOOGLE PLACES API PROXY ---
adminRouter.get("/google-place-details", async (req, res) => {
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: "place_id required" });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
      console.error("Google Maps API Key is not configured.");
      return res.status(500).json({ error: "Server configuration error." });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&key=${apiKey}&language=zh-TW`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Google Places API proxy error:", err);
    res.status(500).json({ error: "Google Places API proxy error" });
  }
});

// --- CONFERENCE RECORDS ---
adminRouter.get("/conference-records", async (req, res) => {
  try {
    const snapshot = await ConferenceRecords
      .where("visibility", "==", true)
      .orderBy("uploadDate", "desc")
      .get();
    
    const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: safeToISOString(doc.data().uploadDate),
    }));
    
    res.json(records);
  } catch (err) {
    console.error("Error fetching conference records:", err);
    res.status(500).json({ error: "Failed to fetch conference records" });
  }
});

adminRouter.post("/conference-records", firebaseAuthMiddleware, async (req, res) => {
  try {
    const { fileName, category, originalFileName, fileSize, storagePath, downloadUrl } = req.body;
    if (!fileName || !category || !downloadUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const recordData = {
      fileName, category,
      originalFileName: originalFileName || fileName,
      fileSize: fileSize || 0,
      storagePath, downloadUrl,
      uploadDate: new Date(),
      uploadedBy: req.user.uid,
      visibility: true,
    };
    
    const docRef = await ConferenceRecords.add(recordData);
    await logHistory(req, `Uploaded conference record: ${docRef.id} (${fileName})`);
    
    res.status(201).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("Error creating conference record:", err);
    res.status(500).json({ error: "Failed to create conference record" });
  }
});

adminRouter.put("/conference-records/:id", firebaseAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, category } = req.body;
    if (!fileName || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const updateData = {
      fileName, category,
      updatedAt: new Date(),
      updatedBy: req.user.uid,
    };
    
    await ConferenceRecords.doc(id).update(updateData);
    await logHistory(req, `Updated conference record: ${id}`);
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating conference record:", err);
    res.status(500).json({ error: "Failed to update conference record" });
  }
});

adminRouter.delete("/conference-records/:id", firebaseAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const recordDoc = await ConferenceRecords.doc(id).get();
    if (!recordDoc.exists) return res.status(404).json({ error: "Record not found" });
    
    const recordData = recordDoc.data();
    if (recordData.storagePath) {
      try {
        const bucket = admin.storage().bucket();
        await bucket.file(recordData.storagePath).delete();
      } catch (storageErr) {
        console.warn(`Failed to delete file from storage (${recordData.storagePath}):`, storageErr);
      }
    }
    
    await ConferenceRecords.doc(id).delete();
    await logHistory(req, `Deleted conference record: ${id} (${recordData.fileName})`);
    
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting conference record:", err);
    res.status(500).json({ error: "Failed to delete conference record" });
  }
});


// ... (migrate-images endpoint can be removed if it was a one-off script, or kept if needed)
// For now, I will keep it but protect it properly.

const { Readable } = require("stream");

// Helper function to download a file from a URL and store it in Firebase Storage
async function downloadAndStoreFile(url, storagePath) {
    // ... (This function seems fine, no changes needed)
}

adminRouter.post("/migrate-images", firebaseAuthMiddleware, async (req, res) => {
  try {
    const user = req.user;
    // A simple way to check for admin is to check a custom claim.
    // This needs to be set manually on the user account via the Admin SDK.
    if (!user.admin) {
      return res.status(403).json({ error: "Permission denied. Admin role required." });
    }

    await logHistory(req, "Started image migration process.");
    // ... (rest of the migration logic)
    res.json(results);
  } catch (error) {
    console.error("Image migration process failed:", error);
    await logHistory(req, `Image migration failed: ${error.message}`);
    res.status(500).json({ error: "Image migration process failed." });
  }
});


adminRouter.post("/members/update-grades", firebaseAuthMiddleware, async (req, res) => {
    try {
        const membersSnapshot = await Members.get();
        const batch = admin.firestore().batch();
        let updatedCount = 0;

        membersSnapshot.forEach(doc => {
            const member = doc.data();
            if (member.studentId && validateStudentId(member.studentId)) {
                const newDepartmentYear = getDepartmentAndYear(member.studentId);
                if (newDepartmentYear && newDepartmentYear !== member.departmentYear) {
                    const memberRef = Members.doc(doc.id);
                    batch.update(memberRef, { departmentYear: newDepartmentYear });
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
        }

        const message = `Successfully updated ${updatedCount} members' grades.`;
        await logHistory(req, message);
        res.status(200).json({ success: true, message });

    } catch (error) {
        console.error("Error updating member grades:", error);
        await logHistory(req, `Failed to update member grades: ${error.message}`);
        res.status(500).json({ success: false, message: "An error occurred while updating grades." });
    }
});

module.exports = { adminRouter };
