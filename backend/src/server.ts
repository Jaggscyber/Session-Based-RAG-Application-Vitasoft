import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { uploadDocument, askQuestion, deleteFile, clearSession } from './controllers/rag';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-session-id']
}));
app.use(express.json());

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// Routes
app.post('/api/upload', upload.single('file'), uploadDocument);
app.post('/api/ask', askQuestion);

// Route to delete a specific file's chunks
app.delete('/api/session/:fileName', deleteFile);

//Route to wipe the entire session using the controller
app.delete('/api/session', clearSession);

app.listen(port, () => {
    console.log(`RAG Backend running on http://localhost:${port}`);
});