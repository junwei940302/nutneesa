const crypto = require("crypto");
const Members = require("./models/members");
const History = require("./models/history");

function sha256(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Firestore 版 logHistory
async function logHistory(req, operation) {
  let executerName = "Unknown";
  try {
    if (req.session && req.session.userId) {
      const memberDoc = await Members.doc(req.session.userId).get();
      if (memberDoc.exists) {
        const member = memberDoc.data();
        executerName = member.name || "Unknown";
      }
    }
    await History.add({
      alertDate: new Date(),
      alertPath: req.originalUrl,
      content: operation,
      executer: executerName,
      confirm: false,
      securityChecker: "Uncheck",
    });
  } catch (err) {
    console.error("Failed to log history:", err);
  }
}

module.exports = { sha256, logHistory }; 