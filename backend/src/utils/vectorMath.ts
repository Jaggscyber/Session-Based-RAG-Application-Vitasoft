// Transforms the vector into a unit vector (magnitude of 1)
export function normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector; // Prevent division by zero
    return vector.map(val => val / magnitude);
}

export function optimizedCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
}