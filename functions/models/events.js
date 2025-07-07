const mongoose = require("mongoose");

const eventsSchema = new mongoose.Schema({
  visibility: Boolean,
  imgUrl: String,
  title: String,
  hashtag: String,
  status: String,
  content: String,
  nonMemberPrice: Number,
  memberPrice: Number,
  publisher: String,
  createDate: Date,
  startEnrollDate: Date,
  endEnrollDate: Date,
  eventDate: Date,
  enrollQuantity: Number,
  restrictDepartment: String,
  restrictYear: String,
  restrictMember: Boolean,
  restrictQuantity: Number,
  location: String,
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Forms",
    required: false,
  },
}, {collection: "events"});

module.exports = mongoose.model("Events", eventsSchema);
