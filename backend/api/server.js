require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const News = require('./models/news');
const History = require('./models/history');
const Members = require('./models/members');
const Flows = require('./models/flows');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI; // Placeholder for future MongoDB connection

app.use(cors());
app.use(express.json());

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected!'))
    .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.json({ message: 'API is running!' });
});

// 新增 API 路由
app.get('/api/news', async (req, res) => {
    try {
        const newsList = await News.find({ visibility: true }).sort({ publishDate: -1 });
        res.json(newsList);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI ? 'Loaded' : 'Not set'}`);
}); 