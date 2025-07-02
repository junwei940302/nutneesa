const mongoose = require("mongoose");

const flowsSchema = new mongoose.Schema({
  flowType: String,
  firstClassSort: String,
  content: String,
  value: Number,
  flowDate: Date,
  handler: String,
}, {collection: "flows"});

module.exports = mongoose.model("Flows", flowsSchema);
