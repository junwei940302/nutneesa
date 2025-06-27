require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const News = require('./models/news');
const History = require('./models/history');
const Members = require('./models/members');
const Flows = require('./models/flows');
const crypto = require('crypto');
const members = require('./models/members');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI; // Placeholder for future MongoDB connection

// 解析環境變數成陣列
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map(url => url.trim())
  : [];

app.use(cors({
    origin: function(origin, callback){
      // 允許本地測試時 origin 為 undefined
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true
}));
app.use(express.json());

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected!'))
    .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.json({ message: 'API is running!' });
});

// Helper function for logging
async function logHistory(req, operation) {
    try {
        await History.create({
            alertDate: new Date(),
            alertPath: req.originalUrl,
            content: operation,
            executer: req.cookies && req.cookies.token ? req.cookies.token : 'Unknown',
            confirm: false,
            securityChecker: 'N/A'
        });
    } catch (err) {
        console.error('Failed to log history:', err);
    }
}

// 新增 API 路由
app.get('/api/news', async (req, res) => {
    try {
        const newsList = await News.find({ visibility: true }).sort({ publishDate: -1 });
        res.json(newsList);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

app.get('/api/admin/news', async (req, res) => {
    try {
        const newsList = await News.find({}).sort({ publishDate: -1 });
        res.json(newsList);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch news for admin' });
    }
});

app.patch('/api/admin/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { visibility } = req.body;

        if (typeof visibility !== 'boolean') {
            return res.status(400).json({ error: 'Invalid visibility value' });
        }

        const updatedNews = await News.findByIdAndUpdate(
            id,
            { visibility },
            { new: true }
        );

        if (!updatedNews) {
            return res.status(404).json({ error: 'News not found' });
        }
        await logHistory(req, `Update news visibility: ${id} to ${visibility}`);
        res.json(updatedNews);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update news visibility' });
    }
});

app.post('/api/admin/news', async (req, res) => {
    try {
        const { type, content, publishDate, visibility } = req.body;

        if (!type || !content) {
            return res.status(400).json({ error: 'Type and content are required' });
        }

        const newNews = new News({
            type,
            content,
            publisher: 'Admin', // Placeholder for publisher
            createDate: new Date(),
            publishDate: publishDate ? new Date(publishDate) : new Date(),
            visibility: visibility !== undefined ? visibility : true,
        });

        await newNews.save();
        await logHistory(req, `Create news: ${type} - ${content}`);
        res.status(201).json(newNews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create news' });
    }
});

app.delete('/api/admin/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedNews = await News.findByIdAndDelete(id);

        if (!deletedNews) {
            return res.status(404).json({ error: 'News not found' });
        }
        await logHistory(req, `Delete news: ${id}`);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete news' });
    }
});

// 新增會員列表 API
app.get('/api/admin/members', async (req, res) => {
    try {
        const membersList = await Members.find({});
        res.json(membersList);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// 新增會員 API
app.post('/api/admin/members', async (req, res) => {
    try {
        const { role, name, status, studentId, departmentYear, email, phone, gender, verification } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const newMember = new Members({
            role: role || '本系會員',
            name,
            status: status || '待驗證',
            studentId: studentId || '',
            departmentYear: departmentYear || '',
            email: email || '',
            phone: phone || '',
            gender: gender || '其他',
            verification: verification !== undefined ? verification : false,
            registerDate: new Date(),
            lastOnline: new Date(),
            cumulativeConsumption: 0,
        });
        await newMember.save();
        await logHistory(req, `Create member: ${name} (${email})`);
        res.status(201).json(newMember);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// 註銷 API
app.delete('/api/admin/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMember = await Members.findByIdAndDelete(id);
        if (!deletedMember) {
            return res.status(404).json({ error: 'Member not found' });
        }
        await logHistory(req, `Delete member: ${id}`);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

function sha256(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 註冊 API
app.post('/api/register', async (req, res) => {
    const { email, password, memberName, studentId, gender, departmentYear, phone } = req.body;
    if (!email || !password) {
        return res.json({ success: false, message: '請填寫所有欄位 / Please fill all fields.' });
    }
    try {
        const exist = await Members.findOne({ email });
        if (exist) {
            return res.json({ success: false, message: 'Email 已註冊 / Email already registered.' });
        }
        let targetRole = departmentYear && departmentYear.includes('電機') ? '本系會員' : '非本系會員';
        const hashed = sha256(password);
        const member = new Members({
            role: targetRole,
            name: memberName,
            status: '待驗證',
            studentId,
            gender,
            email,
            phone,
            departmentYear,
            registerDate: new Date(),
            lastOnline: new Date(),
            cumulativeConsumption: 0,
            verification: false,
            password: hashed
        });
        await member.save();
        res.json({ success: true, message: '註冊成功 / Register success!' });
    } catch (err) {
        res.status(500).json({ success: false, message: '伺服器錯誤 / Server error.' });
    }
});

// 登入 API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.json({ success: false, message: '請輸入帳號密碼 / Please enter email and password.' });
    }
    try {
        const hashed = sha256(password);
        const member = await Members.findOne({ email, password: hashed });
        if (!member) {
            return res.json({ success: false, message: '帳號或密碼錯誤 / Invalid email or password.' });
        }
        const memberId = member._id.toString();
        member.lastOnline = new Date();
        await member.save();
        
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', memberId, {
            httpOnly: true,
            sameSite: isProduction ? 'none' : 'lax',
            secure: isProduction,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            path: '/'
        });
        res.json({ success: true, message: '登入成功 / Login success!', role: member.role });
    } catch (err) {
        res.status(500).json({ success: false, message: '伺服器錯誤 / Server error.' });
    }
});

// 登出 API
app.post('/api/logout', async (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: '已登出 / Logged out' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI ? 'Loaded' : 'Not set'}`);
}); 