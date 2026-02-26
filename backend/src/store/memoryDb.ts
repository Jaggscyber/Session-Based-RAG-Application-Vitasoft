import { ChunkData } from '../types';

class MemoryStore {
    private store = new Map<string, ChunkData[]>();

    // Ensures strict session isolation
    addChunks(sessionId: string, chunks: ChunkData[]): void {
        const existing = this.store.get(sessionId) || [];
        this.store.set(sessionId, [...existing, ...chunks]);
    }

    getChunks(sessionId: string): ChunkData[] {
        return this.store.get(sessionId) || [];
    }

    clearSession(sessionId: string): void {
        this.store.delete(sessionId);
    }
}

export const vectorStore = new MemoryStore();