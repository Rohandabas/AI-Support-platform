import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { widgetAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { generateAIResponse } from '../services/aiService';
import Conversation from '../models/Conversation';
import Ticket from '../models/Ticket';
import Escalation from '../models/Escalation';
import Business from '../models/Business';
import { io } from '../server';

const router = Router();

// POST /api/chat/message
router.post(
  '/message',
  widgetAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const {
      message,
      sessionId,
      customerName = 'Guest',
      customerEmail = '',
    } = req.body;

    if (!message || !sessionId) {
      res.status(400).json({ success: false, message: 'Message and sessionId are required' });
      return;
    }

    // Get or create conversation
    let conversation = await Conversation.findOne({ sessionId, tenantId });
    if (!conversation) {
      conversation = await Conversation.create({
        tenantId,
        sessionId,
        customerName,
        customerEmail,
        messages: [],
        status: 'active',
      });
    }

    // Update customer info if provided
    if (customerName && customerName !== 'Guest') conversation.customerName = customerName;
    if (customerEmail) conversation.customerEmail = customerEmail;

    // Get business config
    const business = await Business.findOne({ tenantId });
    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }

    // Add user message
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);

    // Generate AI response
    const aiResponse = await generateAIResponse(
      message,
      tenantId,
      business.config,
      conversation.messages
    );

    // Add AI message
    const assistantMessage = {
      role: 'assistant' as const,
      content: aiResponse.content,
      timestamp: new Date(),
      escalationFlag: aiResponse.escalationFlag,
      escalationReason: aiResponse.escalationReason,
      responseTime: aiResponse.responseTime,
    };
    conversation.messages.push(assistantMessage);

    // Handle escalation
    let ticket = null;
    let escalation = null;

    if (aiResponse.escalationFlag && !conversation.isEscalated) {
      conversation.isEscalated = true;
      conversation.status = 'escalated';

      // Create ticket
      ticket = await Ticket.create({
        tenantId,
        conversationId: conversation._id,
        sessionId,
        customerName: conversation.customerName || 'Unknown',
        customerEmail: conversation.customerEmail || 'unknown@example.com',
        subject: `Support Request: ${message.substring(0, 80)}`,
        description: message,
        priority: determinePriority(message, aiResponse.escalationReason),
        status: 'open',
      });

      // Create escalation record
      escalation = await Escalation.create({
        tenantId,
        ticketId: ticket._id,
        conversationId: conversation._id,
        sessionId,
        customerName: conversation.customerName || 'Unknown',
        customerEmail: conversation.customerEmail || 'unknown@example.com',
        reason: aiResponse.escalationReason || 'AI escalation',
        priority: ticket.priority,
      });

      conversation.ticketId = ticket._id;

      // Emit real-time notification
      io.to(`admin:${tenantId}`).emit('new-escalation', {
        ticket,
        escalation,
        conversationId: conversation._id,
      });
    } else if (aiResponse.resolved) {
      conversation.status = 'resolved';
    }

    await conversation.save();

    // Emit message to admin room (for human handoff)
    io.to(`conversation:${conversation._id}`).emit('new-message', {
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      data: {
        message: aiResponse.content,
        conversationId: conversation._id,
        escalated: aiResponse.escalationFlag,
        escalationReason: aiResponse.escalationReason,
        suggestedQuestions: aiResponse.suggestedQuestions,
        ticket: ticket ? { id: ticket._id, number: ticket.ticketNumber } : null,
        resolved: aiResponse.resolved,
        responseTime: aiResponse.responseTime,
      },
    });
  })
);

// GET /api/chat/session/:sessionId
router.get(
  '/session/:sessionId',
  widgetAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const tenantId = req.tenantId!;

    const conversation = await Conversation.findOne({ sessionId, tenantId });

    if (!conversation) {
      const business = await Business.findOne({ tenantId });
      res.json({
        success: true,
        data: {
          messages: [],
          config: business?.config || {},
        },
      });
      return;
    }

    const business = await Business.findOne({ tenantId });

    res.json({
      success: true,
      data: {
        messages: conversation.messages,
        conversationId: conversation._id,
        status: conversation.status,
        config: business?.config || {},
        agentJoined: conversation.agentJoined,
        agentName: conversation.agentName,
      },
    });
  })
);

// GET /api/chat/config
router.get(
  '/config',
  widgetAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const business = await Business.findOne({ tenantId });

    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }

    res.json({ success: true, data: business.config });
  })
);

const determinePriority = (message: string, escalationReason?: string): 'low' | 'medium' | 'high' | 'urgent' => {
  const text = `${message} ${escalationReason || ''}`.toLowerCase();
  if (text.includes('refund') || text.includes('legal') || text.includes('fraud') || text.includes('outage')) {
    return 'urgent';
  }
  if (text.includes('payment') || text.includes('charge') || text.includes('angry') || text.includes('furious')) {
    return 'high';
  }
  if (text.includes('broken') || text.includes('error') || text.includes('wrong')) {
    return 'medium';
  }
  return 'low';
};

export default router;
