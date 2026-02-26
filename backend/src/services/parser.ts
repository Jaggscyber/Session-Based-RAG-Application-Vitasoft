import pdfParse from "pdf-parse";

export async function extractText(
  buffer: Buffer,
  mimetype: string
): Promise<string> {

  if (mimetype === "application/pdf") {
    try {
      const data = await pdfParse(buffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error("Empty PDF content");
      }

      return data.text;
    } catch (err) {
      console.error("PDF parsing failed:", err);
      throw new Error("Could not read text from this PDF.");
    }
  }

  if (mimetype === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Only .pdf and .txt allowed.");
}


export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {

  const chunks: string[] = [];
  const cleanText = text.replace(/\s+/g, " ").trim();

  let start = 0;

  while (start < cleanText.length) {
    const end = start + chunkSize;
    chunks.push(cleanText.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}