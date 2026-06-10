import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import Business from '../models/Business';

const router = Router();

// GET /api/widget/config?tenantId=xxx
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.query;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'tenantId required' });
      return;
    }

    const business = await Business.findOne({ tenantId: tenantId as string, isActive: true });
    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        tenantId: business.tenantId,
        businessName: business.name,
        botName: business.config.botName,
        welcomeMessage: business.config.welcomeMessage,
        primaryColor: business.config.primaryColor,
        suggestedQuestions: business.config.suggestedQuestions,
      },
    });
  })
);

export default router;
