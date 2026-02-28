export interface SourceChunk {
    text: string;
    score: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: { text: string; score: number }[];
}

export interface RecentChat {
    id: string;
    title: string;
}

export interface UploadResponse {
    status: string;
    chunksCreated: number;
    sessionId: string;
}

export interface ApiResponse {
    answer: string;
    sources: string[];
    scores: number[];
    error?: string;
}