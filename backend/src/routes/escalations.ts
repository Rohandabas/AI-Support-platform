import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import Escalation from '../models/Escalation';
import Ticket from '../models/Ticket';

const router = Router();

router.use(authenticate);

// GET /api/escalations
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { page = 1, limit = 20, priority, status } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [escalations, total] = await Promise.all([
      Escalation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('ticketId', 'ticketNumber status')
        .populate('conversationId', 'sessionId'),
      Escalation.countDocuments(filter),
    ]);

    // Counts by priority
    const [urgent, high, medium, low] = await Promise.all([
      Escalation.countDocuments({ tenantId, priority: 'urgent', status: { $ne: 'resolved' } }),
      Escalation.countDocuments({ tenantId, priority: 'high', status: { $ne: 'resolved' } }),
      Escalation.countDocuments({ tenantId, priority: 'medium', status: { $ne: 'resolved' } }),
      Escalation.countDocuments({ tenantId, priority: 'low', status: { $ne: 'resolved' } }),
    ]);

    res.json({
      success: true,
      data: {
        escalations,
        counts: { urgent, high, medium, low },
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

// PUT /api/escalations/:id/acknowledge
router.put(
  '/:id/acknowledge',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const escalation = await Escalation.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status: 'acknowledged' },
      { new: true }
    );

    if (!escalation) {
      res.status(404).json({ success: false, message: 'Escalation not found' });
      return;
    }

    res.json({ success: true, data: escalation });
  })
);

// PUT /api/escalations/:id/resolve
router.put(
  '/:id/resolve',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notes } = req.body;

    const escalation = await Escalation.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        status: 'resolved',
        resolvedBy: req.user?._id,
        resolvedAt: new Date(),
        notes,
      },
      { new: true }
    );

    if (!escalation) {
      res.status(404).json({ success: false, message: 'Escalation not found' });
      return;
    }

    // Also update the linked ticket
    await Ticket.findByIdAndUpdate(escalation.ticketId, { status: 'resolved', resolvedAt: new Date() });

    res.json({ success: true, data: escalation, message: 'Escalation resolved' });
  })
);

export default router;
