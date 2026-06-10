import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import Ticket from '../models/Ticket';

const router = Router();

router.use(authenticate);

// GET /api/tickets
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { page = 1, limit = 20, status, priority, search } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Ticket.countDocuments(filter),
    ]);

    // Count by status
    const [open, inProgress, resolved, closed] = await Promise.all([
      Ticket.countDocuments({ tenantId, status: 'open' }),
      Ticket.countDocuments({ tenantId, status: 'in_progress' }),
      Ticket.countDocuments({ tenantId, status: 'resolved' }),
      Ticket.countDocuments({ tenantId, status: 'closed' }),
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        counts: { open, inProgress, resolved, closed },
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

// GET /api/tickets/:id
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await Ticket.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('conversationId', 'messages sessionId')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    res.json({ success: true, data: ticket });
  })
);

// PUT /api/tickets/:id
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, priority, assignedTo, tags } = req.body;
    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      if (status === 'resolved') updateData.resolvedAt = new Date();
      if (status === 'closed') updateData.closedAt = new Date();
    }
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (tags) updateData.tags = tags;

    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      updateData,
      { new: true }
    );

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    res.json({ success: true, data: ticket, message: 'Ticket updated' });
  })
);

// POST /api/tickets (manual creation)
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { customerName, customerEmail, subject, description, priority } = req.body;
    const tenantId = req.tenantId!;

    if (!customerName || !customerEmail || !subject || !description) {
      res.status(400).json({ success: false, message: 'All fields required' });
      return;
    }

    const ticket = await Ticket.create({
      tenantId,
      customerName,
      customerEmail,
      subject,
      description,
      priority: priority || 'medium',
    });

    res.status(201).json({ success: true, data: ticket });
  })
);

export default router;
