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

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete news' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI ? 'Loaded' : 'Not set'}`);
}); 