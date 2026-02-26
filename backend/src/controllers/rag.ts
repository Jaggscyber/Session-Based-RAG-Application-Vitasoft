import { Request, Response } from 'express';
import { extractText, chunkText } from '../services/parser';
import { vectorStore } from '../store/memoryDb';
import { cosineSimilarity } from '../utils/vectorMath';
import { AskRequest } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const DEFAULT_TOP_K = 3;

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.headers['x-session-id'] as string;
        if (!sessionId) { res.status(400).json({ error: 'Session ID required' }); return; }
        if (!req.file) { res.status(400).json({ error: 'File required' }); return; }

        const text = await extractText(req.file.buffer, req.file.mimetype);
        const chunks = chunkText(text);

        // FIXED: Using the active 2026 Gemini Embedding model
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        
        // Embed all chunks concurrently
        const chunkData = await Promise.all(chunks.map(async (chunk) => {
            const result = await embeddingModel.embedContent(chunk);
            return {
                text: chunk,
                embedding: result.embedding.values
            };
        }));

        vectorStore.addChunks(sessionId, chunkData);

        res.json({ status: 'Success', chunksCreated: chunks.length, sessionId });
    } catch (error) {
        console.error("UPLOAD ERROR:", error);
        res.status(500).json({ error: 'Failed to process document' });
    }
};

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.headers['x-session-id'] as string;
        const { question, threshold = 0.75 } = req.body as AskRequest;

        const storedChunks = vectorStore.getChunks(sessionId);
        if (storedChunks.length === 0) {
            res.status(400).json({ error: 'No documents uploaded for this session.' }); return;
        }

        // FIXED: Using the active 2026 Gemini Embedding model
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const qEmbeddingResult = await embeddingModel.embedContent(question);
        const queryVector = qEmbeddingResult.embedding.values;

        // Manual Similarity & Retrieval
        const scoredChunks = storedChunks.map(chunk => ({
            text: chunk.text,
            score: cosineSimilarity(queryVector, chunk.embedding)
        })).sort((a, b) => b.score - a.score).slice(0, DEFAULT_TOP_K);

        // Strict Guardrail Check
        if (scoredChunks[0].score < threshold) {
            res.json({ 
                answer: "This question is outside the scope of uploaded documents.", 
                sources: [], 
                scores: [] 
            });
            return;
        }

        // Build Prompt strictly from context to prevent hallucinations
        const context = scoredChunks.map(c => c.text).join('\n\n---\n\n');
        const prompt = `You are a strict, professional assistant. Answer the user's question ONLY using the provided document context below. Do NOT use any external knowledge. If the answer cannot be found in the context, reply exactly with: "I cannot answer this based on the provided documents."\n\nContext:\n${context}\n\nQuestion: ${question}`;

        // FIXED: Using the active 2026 Gemini 2.5 Flash model
        const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const completion = await chatModel.generateContent(prompt);

        res.json({
            answer: completion.response.text(),
            sources: scoredChunks.map(c => c.text),
            scores: scoredChunks.map(c => c.score)
        });

    } catch (error) {
        console.error("ASK ERROR:", error);
        res.status(500).json({ error: 'Failed to generate answer' });
    }
};