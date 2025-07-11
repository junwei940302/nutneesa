// Firestore 版本
const db = require("../firestore");
const formsCollection = db.collection("forms");
module.exports = formsCollection;
