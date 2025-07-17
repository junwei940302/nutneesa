const crypto = require("crypto");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

const Members = admin.firestore().collection("members");

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

// SendGrid 寄信工具
const sgMail = require("@sendgrid/mail");
const path = require("path");
const fs = require("fs");

// 讀取 sendgrid.env 取得 API key
const envPath = path.join(__dirname, "sendgrid.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/SENDGRID_API_KEY=['"](.+?)['"]/);
  if (match) {
    sgMail.setApiKey(match[1]);
  }
}

/**
 * 發送驗證信
 * @param {string} to 收件人 email
 * @param {string} name 用戶名稱
 * @param {string} code 驗證碼
 * @param {string} authlink 驗證連結
 * @param {string} templateId SendGrid template id
 */
async function sendVerificationEmail({ to, name, code, authlink, templateId }) {
  const msg = {
    to,
    from: "no-reply@nutneesa.online", // 請換成你的 verified sender
    templateId, 
    dynamic_template_data: {
      name,
      code,
      authlink,
    },
  };
  await sgMail.send(msg);
}

module.exports = { sha256, logHistory, firebaseAuthMiddleware, sendVerificationEmail }; 