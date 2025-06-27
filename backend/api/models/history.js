const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    alertDate: Date,
    alertPath: String,
    content: String,
    executer: String,
    confirm: Boolean,
    securityChecker: String
}, { collection: 'history' });

module.exports = mongoose.model('History', historySchema);
