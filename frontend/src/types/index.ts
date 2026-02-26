export interface SourceChunk {
    text: string;
    score: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: SourceChunk[];
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