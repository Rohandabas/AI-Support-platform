import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding } from '../config/gemini';
import { addDocumentChunks, deleteDocumentChunks } from './vectorService';
import KBDocument from '../models/Document';

const CHUNK_SIZE = 500;    // tokens (approx characters / 4)
const CHUNK_OVERLAP = 50;

// Extract text from various file types
const extractText = async (filePath: string, fileType: string): Promise<string> => {
  switch (fileType) {
    case 'pdf': {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    case 'txt':
    case 'md': {
      return fs.readFileSync(filePath, 'utf-8');
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

// Split text into overlapping chunks
const chunkText = (text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 20) { // Skip very short chunks
      chunks.push(chunk.trim());
    }
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
};

// Process and index a single document
export const processDocument = async (
  documentId: string,
  tenantId: string
): Promise<void> => {
  const doc = await KBDocument.findById(documentId);
  if (!doc) throw new Error('Document not found');

  // Update status to processing
  doc.status = 'processing';
  await doc.save();

  try {
    // 1. Extract text
    const rawText = await extractText(doc.filePath, doc.fileType);

    if (!rawText || rawText.trim().length < 10) {
      throw new Error('Could not extract meaningful text from document');
    }

    // 2. Clean and chunk the text
    const cleanText = rawText.replace(/\s+/g, ' ').trim();
    const chunks = chunkText(cleanText);

    if (chunks.length === 0) {
      throw new Error('No valid chunks created from document');
    }

    // 3. Generate embeddings and prepare for ChromaDB
    console.log(`Processing ${chunks.length} chunks for document ${documentId}...`);

    const chromaChunks: Array<{
      id: string;
      text: string;
      embedding: number[];
      metadata: Record<string, string | number | boolean>;
    }> = [];

    // Process in batches of 10 to avoid API rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chunk, j) => {
        const embedding = await generateEmbedding(chunk);
        return {
          id: `${documentId}_chunk_${i + j}_${uuidv4()}`,
          text: chunk,
          embedding,
          metadata: {
            documentId,
            tenantId,
            chunkIndex: i + j,
            filename: doc.originalName,
          },
        };
      });

      const batchResults = await Promise.all(batchPromises);
      chromaChunks.push(...batchResults);

      // Rate limiting delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 4. Store in ChromaDB
    await addDocumentChunks(tenantId, documentId, chromaChunks);

    // 5. Update document status
    doc.status = 'indexed';
    doc.chunkCount = chunks.length;
    doc.chromaCollectionId = `tenant_${tenantId}`;
    await doc.save();

    console.log(`✅ Document ${doc.originalName} indexed: ${chunks.length} chunks`);
  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error);
    doc.status = 'failed';
    doc.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await doc.save();
    throw error;
  }
};

// Re-index all documents for a tenant
export const reindexAllDocuments = async (tenantId: string): Promise<{ success: number; failed: number }> => {
  const documents = await KBDocument.find({ tenantId, status: { $in: ['indexed', 'failed'] } });
  let success = 0;
  let failed = 0;

  for (const doc of documents) {
    try {
      // Delete existing chunks
      await deleteDocumentChunks(tenantId, doc._id.toString());
      // Re-process
      await processDocument(doc._id.toString(), tenantId);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
};

// Delete a document and its chunks
export const deleteDocument = async (documentId: string, tenantId: string): Promise<void> => {
  await deleteDocumentChunks(tenantId, documentId);

  const doc = await KBDocument.findById(documentId);
  if (doc?.filePath && fs.existsSync(doc.filePath)) {
    fs.unlinkSync(doc.filePath);
  }

  await KBDocument.findByIdAndDelete(documentId);
};
