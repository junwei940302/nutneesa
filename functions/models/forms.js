const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema({
  id: { // 讓responses模型尋找對應表單
    type: String,
    required: true,
  },
  label: { // 題目
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["input", "textarea", "radio", "checkbox", "select", "text-block", "date", "file"],
  },
  required: { // 必填與非必填
    type: Boolean,
    default: false,
  },
  options: { // 某些題型需要（避免出現undefined）
    type: [String],
    default: [],
  },
  order: { // 題目排序
    type: Number,
    default: 0,
  },
}, {_id: false});

const formsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  fields: {
    type: [fieldSchema],
    default: [],
  },
}, {
  collection: "forms",
  timestamps: true,
});

module.exports = mongoose.model("Forms", formsSchema);
