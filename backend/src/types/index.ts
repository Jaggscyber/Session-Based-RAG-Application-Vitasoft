export interface ChunkData {
    text: string;
    embedding: number[];
    fileName: string;
}

export interface AskRequest {
    question: string;
    threshold?: number;
    topK?: number;
}

export interface ApiResponse {
    answer: string;
    sources: string[];
    scores: number[];
    error?: string;
}