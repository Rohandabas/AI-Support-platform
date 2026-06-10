import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import Conversation from '../models/Conversation';

const router = Router();

router.use(authenticate);

// GET /api/conversations
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { page = 1, limit = 20, status, search } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { 'messages.content': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-messages'),
      Conversation.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  })
);

// GET /api/conversations/:id
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const conversation = await Conversation.findOne({ _id: id, tenantId }).populate('ticketId');
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    res.json({ success: true, data: conversation });
  })
);

// PUT /api/conversations/:id/status
router.put(
  '/:id/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.tenantId!;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: id, tenantId },
      { status, ...(status === 'resolved' ? { endedAt: new Date() } : {}) },
      { new: true }
    );

    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    res.json({ success: true, data: conversation });
  })
);

export default router;
