// Firestore 版本
const db = require("../firestore");
const newsCollection = db.collection("news");
module.exports = newsCollection;
