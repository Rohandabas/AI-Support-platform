import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import Business from '../models/Business';

const router = Router();

router.use(authenticate);

// GET /api/ai-config
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const business = await Business.findOne({ tenantId: req.tenantId });
    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }
    res.json({ success: true, data: business.config });
  })
);

// PUT /api/ai-config
router.put(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { botName, welcomeMessage, personality, primaryColor, escalationRules, suggestedQuestions } = req.body;

    const business = await Business.findOneAndUpdate(
      { tenantId: req.tenantId },
      {
        $set: {
          'config.botName': botName,
          'config.welcomeMessage': welcomeMessage,
          'config.personality': personality,
          'config.primaryColor': primaryColor,
          'config.escalationRules': escalationRules,
          'config.suggestedQuestions': suggestedQuestions,
        },
      },
      { new: true, runValidators: true }
    );

    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }

    res.json({
      success: true,
      message: 'AI configuration updated',
      data: business.config,
    });
  })
);

export default router;
