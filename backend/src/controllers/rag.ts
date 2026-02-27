import { Request, Response } from 'express';
import { extractText, chunkText } from '../services/parser';
import { vectorStore } from '../store/memoryDb';
import { cosineSimilarity } from '../utils/vectorMath';
import { AskRequest, ApiResponse } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.headers['x-session-id'] as string;
        const chunkSize = Math.min(Math.max(parseInt(req.body.chunkSize) || 1000, 100), 5000);

        if (!sessionId || !req.file) { 
            res.status(400).json({ error: 'Session ID and File are required' }); 
            return; 
        }

        const text = await extractText(req.file.buffer, req.file.mimetype);
        const chunks = chunkText(text, chunkSize); 

        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        
        const chunkData = await Promise.all(chunks.map(async (chunk) => {
            const result = await embeddingModel.embedContent(chunk);
            return {
                text: chunk,
                embedding: result.embedding.values,
                fileName: req.file!.originalname
            };
        }));

        vectorStore.addChunks(sessionId, chunkData);
        res.json({ status: 'Success', chunksCreated: chunks.length, sessionId });
    } catch (error) {
        console.error("❌ UPLOAD ERROR:", error);
        res.status(500).json({ error: 'Failed to process document' });
    }
};

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.headers['x-session-id'] as string;
        const topK = Math.min(Math.max(parseInt(req.body.topK) || 3, 1), 10);
        const threshold = Math.min(Math.max(parseFloat(req.body.threshold) || 0.50, 0), 1);
        const question = req.body.question;

        const storedChunks = vectorStore.getChunks(sessionId);
        if (storedChunks.length === 0) {
            res.status(400).json({ error: 'No documents uploaded for this session.' }); return;
        }

        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const qEmbeddingResult = await embeddingModel.embedContent(question);
        const queryVector = qEmbeddingResult.embedding.values;

        const scoredChunks = storedChunks.map(chunk => ({
            text: chunk.text,
            score: cosineSimilarity(queryVector, chunk.embedding)
        })).sort((a, b) => b.score - a.score).slice(0, topK);

        // Strictly filter out chunks below the threshold
        const relevantChunks = scoredChunks.filter(c => c.score >= threshold);

        if (relevantChunks.length === 0) {
            const rejectRes: ApiResponse = { answer: "This question is outside the scope of uploaded documents.", sources: [], scores: [] };
            res.json(rejectRes);
            return;
        }

        const context = relevantChunks.map(c => c.text).join('\n\n---\n\n');
        
        const prompt = `You are an expert analytical assistant. Answer the user's question using ONLY the provided document context below. 
        Rules:
        1. Do NOT use any external knowledge. 
        2. You may synthesize the information found in the context.
        3. If the context does not contain enough information, reply exactly with: "I cannot answer this based on the provided documents."

        Context:
        ${context}

        Question: ${question}`;

        const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const completion = await chatModel.generateContent(prompt);

        const successRes: ApiResponse = {
            answer: completion.response.text(),
            sources: relevantChunks.map(c => c.text),
            scores: relevantChunks.map(c => c.score)
        };
        res.json(successRes);

    } catch (error) {
        console.error("❌ ASK ERROR:", error);
        res.status(500).json({ error: 'Failed to generate answer' });
    }
};

// NEW: This fixes your ReferenceError!
export const deleteFile = (req: Request, res: Response): void => {
    const sessionId = req.headers['x-session-id'] as string;
    const { fileName } = req.params;
    if (sessionId && fileName) {
        vectorStore.removeFileChunks(sessionId, fileName);
    }
    res.json({ success: true });
};