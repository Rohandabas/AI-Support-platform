import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { generateEmbedding } from '../config/gemini';

let client: ChromaClient | null = null;

const getClient = (): ChromaClient => {
  if (!client) {
    client = new ChromaClient({
      path: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || 8000}`,
    });
  }
  return client;
};

// Custom embedding function using Gemini
const geminiEmbedder = {
  generate: async (texts: string[]): Promise<number[][]> => {
    const embeddings = await Promise.all(texts.map((t) => generateEmbedding(t)));
    return embeddings;
  },
};

export const getCollection = async (tenantId: string): Promise<Collection> => {
  const chromaClient = getClient();
  const collectionName = `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  try {
    return await chromaClient.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: geminiEmbedder as unknown as OpenAIEmbeddingFunction,
      metadata: { tenantId },
    });
  } catch (error) {
    console.error('Error getting ChromaDB collection:', error);
    throw error;
  }
};

export const addDocumentChunks = async (
  tenantId: string,
  documentId: string,
  chunks: Array<{ id: string; text: string; embedding: number[]; metadata: Record<string, string | number | boolean> }>
): Promise<void> => {
  const collection = await getCollection(tenantId);

  const ids = chunks.map((c) => c.id);
  const embeddings = chunks.map((c) => c.embedding);
  const documents = chunks.map((c) => c.text);
  const metadatas = chunks.map((c) => ({ ...c.metadata, documentId, tenantId }));

  await collection.add({ ids, embeddings, documents, metadatas });
};

export const queryCollection = async (
  tenantId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<Array<{ text: string; metadata: Record<string, unknown>; distance: number }>> => {
  try {
    const collection = await getCollection(tenantId);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      include: ['documents', 'metadatas', 'distances'] as never,
    });

    if (!results.documents || !results.documents[0]) return [];

    return results.documents[0]
      .map((doc, i) => ({
        text: doc || '',
        metadata: (results.metadatas?.[0]?.[i] || {}) as Record<string, unknown>,
        distance: results.distances?.[0]?.[i] || 0,
      }))
      .filter((r) => r.text);
  } catch (error) {
    console.error('ChromaDB query error:', error);
    return [];
  }
};

export const deleteDocumentChunks = async (
  tenantId: string,
  documentId: string
): Promise<void> => {
  try {
    const collection = await getCollection(tenantId);
    await collection.delete({ where: { documentId } });
  } catch (error) {
    console.error('Error deleting document chunks:', error);
  }
};

export const getCollectionStats = async (tenantId: string): Promise<{ count: number }> => {
  try {
    const collection = await getCollection(tenantId);
    const count = await collection.count();
    return { count };
  } catch {
    return { count: 0 };
  }
};
