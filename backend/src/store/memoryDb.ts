import { ChunkData } from '../types';

interface SessionStore {
    chunks: ChunkData[];
    lastAccessed: number;
}

class MemoryStore {
    private store = new Map<string, SessionStore>();

    addChunks(sessionId: string, newChunks: ChunkData[]): void {
        const existing = this.store.get(sessionId)?.chunks || [];
        this.store.set(sessionId, {
            chunks: [...existing, ...newChunks],
            lastAccessed: Date.now()
        });
    }

    getChunks(sessionId: string): ChunkData[] {
        const session = this.store.get(sessionId);
        if (session) {
            session.lastAccessed = Date.now();
            return session.chunks;
        }
        return [];
    }

    // NEW: Removes chunks belonging to a specific file
    removeFileChunks(sessionId: string, fileName: string): void {
        const session = this.store.get(sessionId);
        if (session) {
            session.chunks = session.chunks.filter(c => c.fileName !== fileName);
            session.lastAccessed = Date.now();
        }
    }

    clearSession(sessionId: string): void {
        this.store.delete(sessionId);
    }
}

export const vectorStore = new MemoryStore();