import { Router, Response } from 'express';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';
import KBDocument from '../models/Document';
import { processDocument, reindexAllDocuments, deleteDocument } from '../services/documentService';

const router = Router();

router.use(authenticate);

// GET /api/documents
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const documents = await KBDocument.find({ tenantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
  })
);

// POST /api/documents/upload
router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '') as 'pdf' | 'docx' | 'txt' | 'md';

    // Create document record
    const doc = await KBDocument.create({
      tenantId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: fileExt,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'pending',
    });

    // Process asynchronously (don't block the response)
    processDocument(doc._id.toString(), tenantId).catch((err) => {
      console.error('Background document processing error:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded and processing started',
      data: doc,
    });
  })
);

// DELETE /api/documents/:id
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const doc = await KBDocument.findOne({ _id: id, tenantId });
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    await deleteDocument(id, tenantId);

    res.json({ success: true, message: 'Document deleted successfully' });
  })
);

// POST /api/documents/reindex
router.post(
  '/reindex',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;

    // Start reindexing asynchronously
    res.json({
      success: true,
      message: 'Reindexing started. This may take a few minutes.',
    });

    reindexAllDocuments(tenantId).catch(console.error);
  })
);

// GET /api/documents/:id/status
router.get(
  '/:id/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const doc = await KBDocument.findOne({ _id: id, tenantId }).select('status chunkCount errorMessage');
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    res.json({ success: true, data: doc });
  })
);

export default router;
