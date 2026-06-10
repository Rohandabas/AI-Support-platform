import mongoose, { Document, Schema } from 'mongoose';

export interface IKBDocument extends Document {
  tenantId: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md';
  filePath: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  chunkCount: number;
  errorMessage?: string;
  chromaCollectionId: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IKBDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'txt', 'md'],
      required: true,
    },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'indexed', 'failed'],
      default: 'pending',
    },
    chunkCount: { type: Number, default: 0 },
    errorMessage: String,
    chromaCollectionId: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IKBDocument>('Document', DocumentSchema);
