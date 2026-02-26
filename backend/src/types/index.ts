export interface ChunkData {
    text: string;
    embedding: number[];
}

export interface AskRequest {
    question: string;
    threshold?: number;
}