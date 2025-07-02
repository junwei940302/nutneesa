const mongoose = require("mongoose");
const {Schema} = mongoose;

const membersSchema = new Schema({
  memberId: {type: Schema.Types.ObjectId},
  role: String,
  name: String,
  status: String,
  studentId: String,
  gender: String,
  email: String,
  phone: String,
  departmentYear: String,
  registerDate: Date,
  lastOnline: Date,
  cumulativeConsumption: Number,
  verification: Boolean,
  password: String,
}, {collection: "members"});

module.exports = mongoose.model("Members", membersSchema);
