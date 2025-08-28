const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

if (!admin.apps.length) {
  admin.initializeApp();
}

// Set SendGrid API Key from environment variables
// This is loaded from .env during local development via `dotenv` in index.js
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY not found. Email sending will be disabled.");
}

const History = admin.firestore().collection("history");
const Members = admin.firestore().collection("members");

/**
 * Middleware to verify Firebase ID token.
 * If valid, attaches the decoded token to `req.user`.
 * This is the standard authentication middleware for all protected routes.
 */
async function firebaseAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authorization token provided." });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach decoded token to req.user
    next();
  } catch (err) {
    console.error("Error verifying auth token:", err);
    return res.status(401).json({ error: "Invalid authorization token." });
  }
}

/**
 * Logs an operation to the history collection.
 * @param {object} req The Express request object, containing req.user.
 * @param {string} operation A description of the operation performed.
 */
async function logHistory(req, operation) {
  let executerName = "Unknown";
  let executerId = "anonymous";

  if (req.user && req.user.uid) {
    executerId = req.user.uid;
    try {
      const memberDoc = await Members.doc(executerId).get();
      if (memberDoc.exists) {
        const member = memberDoc.data();
        // Use displayName, fall back to name, then email
        executerName = member.displayName || member.name || member.email || "Unknown User";
      } else {
        // If not in members collection, get user from Auth
        const authUser = await admin.auth().getUser(executerId);
        executerName = authUser.displayName || authUser.email || "Unknown Auth User";
      }
    } catch (err) {
      console.error(`Failed to get name for user ${executerId}. Error:`, err);
      executerName = "User lookup failed";
    }
  }

  try {
    await History.add({
      alertDate: new Date(),
      alertPath: req.originalUrl,
      content: operation,
      executerId: executerId,
      executer: executerName,
      confirm: false,
      securityChecker: "Uncheck",
    });
  } catch (err) {
    console.error("Failed to log history:", err);
  }
}

/**
 * Sends a verification email using a SendGrid template.
 * @param {object} params
 * @param {string} params.to Recipient's email address.
 * @param {string} params.name User's name.
 * @param {string} params.code Verification code.
 * @param {string} params.authlink Verification link.
 * @param {string} params.templateId SendGrid template ID.
 */
async function sendVerificationEmail({ to, name, code, authlink, templateId }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("Cannot send email: SENDGRID_API_KEY is not set.");
    // In a real app, you might want to throw an error or handle this differently
    return;
  }

  const msg = {
    to,
    from: {
        name: "NUTN EESA",
        email: "no-reply@nutneesa.online", // This must be a verified sender in SendGrid
    },
    templateId,
    dynamic_template_data: {
      name,
      code,
      authlink,
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${to}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
}

// --- Grade Calculation Logic ---

const departmentMap = {
    '12': '教育', '13': '體育', '22': '國語文', '27': '英語', '28': '諮商',
    '29': '經管', '32': '行管', '34': '文資', '40': '特教', '50': '應數',
    '55': '數位', '56': '生態', '58': '生科', '59': '資工', '64': '音樂',
    '67': '材料', '70': '幼教', '72': '戲劇', '82': '電機', '83': '綠能', '90': '視設'
};

const yearInChinese = { 1: '一', 2: '二', 3: '三', 4: '四' };

function validateStudentId(studentId) {
    if (!studentId) return false;
    return /^[A-Z]\d{8}$/.test(studentId);
}

function getDepartmentAndYear(studentId) {
    if (!validateStudentId(studentId)) {
        return null;
    }

    const admissionYear = parseInt(studentId.substring(1, 4), 10);
    const deptCode = studentId.substring(4, 6);

    const department = departmentMap[deptCode];
    if (!department) {
        return null; // Or "未知科系"
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const currentSchoolYearROC = (currentMonth >= 9) ? currentYear - 1911 : currentYear - 1912;

    const grade = currentSchoolYearROC - admissionYear + 1;

    if (grade > 4) {
        return "已畢/肄業";
    } else if (grade < 1) {
        return "新生";
    } else {
        return `${department}${yearInChinese[grade]}`;
    }
}


module.exports = {
  firebaseAuthMiddleware,
  logHistory,
  sendVerificationEmail,
  validateStudentId,
  getDepartmentAndYear,
};