// Transforms the vector into a unit vector (magnitude of 1)
export function normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector; // Prevent division by zero
    return vector.map(val => val / magnitude);
}

// Since the vectors are pre-normalized, Cosine Similarity simplifies directly to the Dot Product.
// This is mathematically faster because it skips calculating square roots during retrieval.
export function optimizedCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
}