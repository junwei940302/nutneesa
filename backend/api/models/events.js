const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
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
    eventDate: Date,
    enrollQuantity: Number,
    restrictDepartment: String,
    restrictYear: String,
    restrictMember: Boolean,
    restrictQuantity: Number
}, { collection: 'events' });

module.exports = mongoose.model('Events', newsSchema);
