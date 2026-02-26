import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { uploadDocument, askQuestion } from './controllers/rag';
import { vectorStore } from './store/memoryDb';

const app = express();
const port = process.env.PORT || 3000;

// FIXED CORS: Explicitly allow Vite frontend and required headers
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-session-id']
}));
app.use(express.json());

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Routes
app.post('/api/upload', upload.single('file'), uploadDocument);
app.post('/api/ask', askQuestion);

// RESET SESSION ROUTE
app.delete('/api/session', (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    if (sessionId) {
        vectorStore.clearSession(sessionId);
    }
    res.json({ message: "Session wiped" });
});

app.listen(port, () => {
    console.log(`🚀 RAG Backend running on http://localhost:${port}`);
});