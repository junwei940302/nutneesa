const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    type: String,
    alertDate: Date,
    alertOrigin: String,
    content: String,
    confirm: Boolean,
    securityChecker: String
}, { collection: 'history' });

module.exports = mongoose.model('History', historySchema);
