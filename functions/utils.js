const crypto = require("crypto");
const Members = require("./models/members");
const History = require("./models/history");

function sha256(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// 非同步歷史紀錄紀錄 function
async function logHistory(req, operation) {
  const executer = await Members.findById(req.session.userId);
  try {
    await History.create({
      alertDate: new Date(),
      alertPath: req.originalUrl,
      content: operation,
      executer: executer ? executer.name : "Unknown",
      confirm: false,
      securityChecker: "Uncheck",
    });
  } catch (err) {
    console.error("Failed to log history:", err);
  }
}

module.exports = { sha256, logHistory }; 