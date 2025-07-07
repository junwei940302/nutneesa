const mongoose = require("mongoose");
const {Schema} = mongoose;

const responseSchema = new Schema({
  activityId: { // 指向對應的活動
    type: Schema.Types.ObjectId,
    ref: "Events",
    required: true,
  },
  formId: { // 指向對應的表單
    type: Schema.Types.ObjectId,
    ref: "Forms",
    required: true,
  },
  userId: { // 指向對應的回答者
    type: Schema.Types.ObjectId,
    ref: "Members",
    required: false,
  },
  answers: {
    type: Schema.Types.Mixed,
    required: true,
  },
  formSnapshot: { // 存當時的表單欄位定義、避免表單更新後，歷史回應「對不起來」
    type: Schema.Types.Mixed,
    required: false,
  },
  // 審核相關欄位
  reviewed: {
    type: Boolean,
    default: false,
  },
  reviewedBy: {
    type: String,
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewNotes: {
    type: String,
    default: "",
  },
  // 付款相關欄位
  paymentStatus: {
    type: String,
    default: "未付款",
  },
  paymentNotes: {
    type: String,
    default: "",
  },
  paymentMethod: {
    type: String,
    default: "未指定",
  },
}, {
  collection: "responses",
  timestamps: true,
});

module.exports = mongoose.model("Responses", responseSchema);
