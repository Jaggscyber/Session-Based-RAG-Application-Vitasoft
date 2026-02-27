export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: { text: string; score: number }[];
}

export interface ChatSession {
    sessionId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    chunks: number;
    files: {name: string}[];
}

export interface ApiResponse {
    answer: string;
    sources: string[];
    scores: number[];
    error?: string;
}

export interface GoogleJwtPayload {
    name: string;
    email: string;
    sub: string;
}