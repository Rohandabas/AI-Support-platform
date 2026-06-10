import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import Conversation from '../models/Conversation';
import Ticket from '../models/Ticket';
import Escalation from '../models/Escalation';
import KBDocument from '../models/Document';

const router = Router();

router.use(authenticate);

// GET /api/analytics
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily conversation counts for chart
    const dailyConversations = await Conversation.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Response time stats
    const responseTimeStats = await Conversation.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate } } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'assistant', 'messages.responseTime': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$messages.responseTime' },
          minResponseTime: { $min: '$messages.responseTime' },
          maxResponseTime: { $max: '$messages.responseTime' },
        },
      },
    ]);

    // Total metrics
    const [
      totalConversations,
      resolvedConversations,
      escalatedConversations,
      openTickets,
      resolvedTickets,
      pendingEscalations,
    ] = await Promise.all([
      Conversation.countDocuments({ tenantId, createdAt: { $gte: startDate } }),
      Conversation.countDocuments({ tenantId, status: 'resolved', createdAt: { $gte: startDate } }),
      Conversation.countDocuments({ tenantId, status: 'escalated', createdAt: { $gte: startDate } }),
      Ticket.countDocuments({ tenantId, status: 'open' }),
      Ticket.countDocuments({ tenantId, status: 'resolved', createdAt: { $gte: startDate } }),
      Escalation.countDocuments({ tenantId, status: 'pending' }),
    ]);

    // Most referenced documents (from conversation metadata)
    const documents = await KBDocument.find({ tenantId, status: 'indexed' })
      .select('originalName chunkCount createdAt')
      .sort({ chunkCount: -1 })
      .limit(10);

    // Ticket priority distribution
    const ticketsByPriority = await Ticket.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Escalation priority distribution
    const escalationsByPriority = await Escalation.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const resolutionRate = totalConversations > 0
      ? Math.round((resolvedConversations / totalConversations) * 100)
      : 0;
    const escalationRate = totalConversations > 0
      ? Math.round((escalatedConversations / totalConversations) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalConversations,
          resolvedConversations,
          escalatedConversations,
          resolutionRate,
          escalationRate,
          avgResponseTime: Math.round(responseTimeStats[0]?.avgResponseTime || 0),
          openTickets,
          resolvedTickets,
          pendingEscalations,
        },
        charts: {
          dailyConversations,
          ticketsByPriority: ticketsByPriority.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {} as Record<string, number>),
          escalationsByPriority: escalationsByPriority.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {} as Record<string, number>),
        },
        knowledgeBase: {
          documents,
          totalDocuments: documents.length,
        },
      },
    });
  })
);

export default router;
