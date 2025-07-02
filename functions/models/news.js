const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  visibility: Boolean,
  type: String,
  content: String,
  publisher: String,
  createDate: Date,
  publishDate: Date,
}, {collection: "news"});

module.exports = mongoose.model("News", newsSchema);
