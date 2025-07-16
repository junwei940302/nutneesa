const crypto = require("crypto");
const admin = require("firebase-admin");

function sha256(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Firestore 版 logHistory
async function logHistory(req, operation) {
  let executerName = "Unknown";
  try {
    const userId = req.userId;
    if (userId) {
      const memberDoc = await Members.doc(userId).get();
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

async function firebaseAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No auth token" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.userId = decodedToken.uid;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

module.exports = { sha256, logHistory, firebaseAuthMiddleware }; 