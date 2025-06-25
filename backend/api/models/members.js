const mongoose = require('mongoose');

const membersSchema = new mongoose.Schema({
    _id: ObjectId,
    role: String,
    name: String,
    studentID: String,
    gender: String,
    email: String,
    phone: String,
    departmentYear: String,
    registerDate: Date,
    lastOnline: Date,
    cumulativeConsumption: Number,
    verification: Boolean
}, { collection: 'members' });

module.exports = mongoose.model('Members', membersSchema);
