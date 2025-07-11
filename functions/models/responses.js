// Firestore 版本
const db = require("../firestore");
const responsesCollection = db.collection("responses");
module.exports = responsesCollection;
