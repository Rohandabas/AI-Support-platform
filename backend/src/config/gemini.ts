import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY not set. AI features will be disabled.');
}

export const genAI = new GoogleGenerativeAI(apiKey || 'placeholder');

// Chat model - Latest stable Gemini Flash for fast, intelligent replies
export const getChatModel = () => genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

// Embedding model for vector search
export const getEmbeddingModel = () => genAI.getGenerativeModel({ model: 'gemini-embedding-2' });

// Generate embeddings for a text
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const model = getEmbeddingModel();
  const result = await model.embedContent(text);
  return result.embedding.values;
};
