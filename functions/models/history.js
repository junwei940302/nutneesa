// Firestore 版本
const db = require("../firestore");
const historyCollection = db.collection("history");
module.exports = historyCollection;
