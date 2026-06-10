import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import Conversation from '../models/Conversation';
import Ticket from '../models/Ticket';
import Escalation from '../models/Escalation';
import KBDocument from '../models/Document';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/stats
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalConversations,
      openTickets,
      resolvedTickets,
      escalatedTickets,
      recentConversations,
      resolvedConversations,
      pendingEscalations,
      documents,
    ] = await Promise.all([
      Conversation.countDocuments({ tenantId }),
      Ticket.countDocuments({ tenantId, status: 'open' }),
      Ticket.countDocuments({ tenantId, status: 'resolved' }),
      Escalation.countDocuments({ tenantId, status: 'pending' }),
      Conversation.countDocuments({ tenantId, createdAt: { $gte: thirtyDaysAgo } }),
      Conversation.countDocuments({ tenantId, status: 'resolved', createdAt: { $gte: thirtyDaysAgo } }),
      Escalation.countDocuments({ tenantId, status: 'pending' }),
      KBDocument.countDocuments({ tenantId, status: 'indexed' }),
    ]);

    const aiResolutionRate = recentConversations > 0
      ? Math.round((resolvedConversations / recentConversations) * 100)
      : 0;

    // Weekly trend (last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeek = await Conversation.countDocuments({ tenantId, createdAt: { $gte: sevenDaysAgo } });
    const lastWeek = await Conversation.countDocuments({
      tenantId,
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    });
    const weeklyTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalConversations,
        openTickets,
        resolvedTickets,
        escalatedTickets,
        aiResolutionRate,
        pendingEscalations,
        documents,
        weeklyTrend,
        recentConversations,
      },
    });
  })
);

// GET /api/dashboard/recent-conversations
router.get(
  '/recent-conversations',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const conversations = await Conversation.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('sessionId customerName customerEmail status messages createdAt');

    res.json({ success: true, data: conversations });
  })
);

// GET /api/dashboard/recent-tickets
router.get(
  '/recent-tickets',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const tickets = await Ticket.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('ticketNumber customerName priority status createdAt');

    res.json({ success: true, data: tickets });
  })
);

export default router;
