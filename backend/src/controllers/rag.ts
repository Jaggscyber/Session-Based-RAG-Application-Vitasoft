import { Request, Response } from 'express';
import { extractText, chunkText } from '../services/parser';
import { vectorStore } from '../store/memoryDb';
import { normalizeVector, optimizedCosineSimilarity } from '../utils/vectorMath';
import { AskRequest, ApiResponse } from '../types';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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

        // Restored to the exact embedding model that successfully uploaded your PDFs
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const chunkData: { text: string; embedding: number[]; fileName: string }[] = [];
        
        // Sequential loop to prevent the 429 Rate Limit Crash
        for (const chunk of chunks) {
            const result = await embeddingModel.embedContent(chunk);
            chunkData.push({
                text: chunk,
                embedding: normalizeVector(result.embedding.values),
                fileName: req.file!.originalname
            });
        }

        vectorStore.addChunks(sessionId, chunkData);
        res.json({ status: 'Success', chunksCreated: chunks.length, sessionId });
    } catch (error: any) {
        console.error("UPLOAD ERROR FULL TRACE:", error);
        res.status(500).json({ error: `Upload Failed: ${error.message || 'Unknown API Error'}` });
    }
};

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now(); 
    try {
        const sessionId = req.headers['x-session-id'] as string;
        const topK = Math.min(Math.max(parseInt(req.body.topK) || 3, 1), 10);
        const threshold = Math.min(Math.max(parseFloat(req.body.threshold) || 0.50, 0), 1);
        
        const maxTokens = Math.min(Math.max(parseInt(req.body.maxTokens) || 2000, 100), 8192);
        const question = req.body.question;

        const storedChunks = vectorStore.getChunks(sessionId);
        if (storedChunks.length === 0) {
            res.status(400).json({ error: 'Server memory reset. Please re-upload your document to restore this session!!' }); 
            return;
        }

        const queryModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const qEmbeddingResult = await queryModel.embedContent(question);
        const queryVector = normalizeVector(qEmbeddingResult.embedding.values);

        const scoredChunks = storedChunks.map(chunk => ({
            text: chunk.text,
            score: optimizedCosineSimilarity(queryVector, chunk.embedding)
        })).sort((a, b) => b.score - a.score).slice(0, topK);

        const relevantChunks = scoredChunks.filter(c => c.score >= threshold);

        if (relevantChunks.length === 0) {
            const rejectRes: ApiResponse = { answer: "This question is outside the scope of uploaded documents.", sources: [], scores: [] };
            res.json(rejectRes);
            return;
        }

        const context = relevantChunks.map(c => c.text).join('\n\n---\n\n');
        
        const prompt = `You are an expert AI tutor helping a student understand their document. 

        Context Information:
        ${context}

        User Question:
        ${question}

        Instructions:
        1. Answer the user's question clearly, comprehensively, and in complete sentences.
        2. If the user asks for steps, bullet points, or lists, format your answer clearly using Markdown.
        3. Base your answer ONLY on the provided Context Information. If the context does not contain the answer, say exactly: "I cannot answer this based on the provided documents."`;

        // RESTORED: The exact model you had working in your very first screenshot!
        const chatModel = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                }
            ]
        });
        
        // The maxOutputTokens here will fix the mid-sentence cut-off you originally had
        const completion = await chatModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens }
        });

        console.info(`[RAG] Response generated in ${Date.now() - startTime}ms`);

        const successRes: ApiResponse = {
            answer: completion.response.text(),
            sources: relevantChunks.map(c => c.text),
            scores: relevantChunks.map(c => c.score)
        };
        res.json(successRes);

    } catch (error: any) {
        console.error("ASK ERROR FULL TRACE:", error);
        res.status(500).json({ error: `API Error: ${error.message || 'Failed to generate answer'}` });
    }
};

export const deleteFile = (req: Request, res: Response): void => {
    const sessionId = req.headers['x-session-id'] as string;
    const fileName = req.params.fileName as string; 
    if (sessionId && fileName) {
        vectorStore.removeFileChunks(sessionId, fileName);
    }
    res.json({ success: true });
};

export const clearSession = (req: Request, res: Response): void => {
    const sessionId = req.headers['x-session-id'] as string;
    if (sessionId) {
        vectorStore.clearSession(sessionId);
    }
    res.json({ success: true, message: 'Session memory cleared successfully' });
};