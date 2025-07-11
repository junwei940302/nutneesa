// Firestore 版本
const db = require("../firestore");
const mapItemsCollection = db.collection("MapItems");
module.exports = mapItemsCollection;
