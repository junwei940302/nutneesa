// Firestore 版本
const db = require("../firestore");
const eventsCollection = db.collection("events");
module.exports = eventsCollection;
