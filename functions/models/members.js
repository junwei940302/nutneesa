// Firestore 版本
const db = require("../firestore");
const membersCollection = db.collection("members");
module.exports = membersCollection;
