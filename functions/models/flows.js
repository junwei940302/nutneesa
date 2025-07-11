// Firestore 版本
const db = require("../firestore");
const flowsCollection = db.collection("flows");
module.exports = flowsCollection;
