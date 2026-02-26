import { Request, Response } from 'express';
import { extractText, chunkText } from '../services/parser';
import { vectorStore } from '../store/memoryDb';
import { cosineSimilarity } from '../utils/vectorMath';
import { AskRequest } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const DEFAULT_TOP_K = 3;

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.headers['x-session-id'] as string;
        if (!sessionId || !req.file) { 
            res.status(400).json({ error: 'Session ID and File are required' }); 
            return; 
        }

        console.log(`\n⚙️ [SESSION: ${sessionId.slice(0,6)}] Processing file...`);

        const text = await extractText(req.file.buffer, req.file.mimetype);
        const chunks = chunkText(text);

        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        
        const chunkData = await Promise.all(chunks.map(async (chunk) => {
            const result = await embeddingModel.embedContent(chunk);
            return {
                text: chunk,
                embedding: result.embedding.values
            };
        }));

        vectorStore.addChunks(sessionId, chunkData);
        console.log(`✅ Stored ${chunks.length} chunks.`);

        res.json({ status: 'Success', chunksCreated: chunks.length, sessionId });
    } catch (error) {
        console.error("❌ UPLOAD ERROR:", error);
        res.status(500).json({ error: 'Failed to process document' });
    }
};

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.headers['x-session-id'] as string;
        // Defaulting to 0.50 to perfectly match Gemini's embedding space
        const { question, threshold = 0.50 } = req.body as AskRequest; 

        const storedChunks = vectorStore.getChunks(sessionId);
        if (storedChunks.length === 0) {
            res.status(400).json({ error: 'No documents uploaded for this session.' }); return;
        }

        // 1. Generate embedding for the question
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const qEmbeddingResult = await embeddingModel.embedContent(question);
        const queryVector = qEmbeddingResult.embedding.values;

        // 2 & 3. Compute cosine similarity and retrieve Top K chunks
        const scoredChunks = storedChunks.map(chunk => ({
            text: chunk.text,
            score: cosineSimilarity(queryVector, chunk.embedding)
        })).sort((a, b) => b.score - a.score).slice(0, DEFAULT_TOP_K);

        // 4. If similarity score is below threshold -> return rejection
        if (scoredChunks[0].score < threshold) {
            res.json({ 
                answer: "This question is outside the scope of uploaded documents.", 
                sources: [], 
                scores: [] 
            });
            return;
        }

        // 5. Otherwise: Build a prompt using only retrieved chunks to prevent hallucinations
        const context = scoredChunks.map(c => c.text).join('\n\n---\n\n');
        
        const prompt = `You are an expert analytical assistant. Your task is to answer the user's question using ONLY the provided document context below. 
        
        Rules to prevent hallucinations:
        1. Do NOT use any external knowledge. 
        2. You may summarize, compare, and synthesize the information found in the context to construct a highly accurate answer.
        3. If the provided context does not contain enough relevant information to answer the question, reply exactly with: "I cannot answer this based on the provided documents."

        Context:
        ${context}

        Question: ${question}`;

        // Send to LLM and Return grounded response
        const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const completion = await chatModel.generateContent(prompt);

        res.json({
            answer: completion.response.text(),
            sources: scoredChunks.map(c => c.text),
            scores: scoredChunks.map(c => c.score)
        });

    } catch (error) {
        console.error("❌ ASK ERROR:", error);
        res.status(500).json({ error: 'Failed to generate answer' });
    }
};