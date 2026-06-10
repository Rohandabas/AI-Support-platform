import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import Business from '../models/Business';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const generateTokens = (userId: string, tenantId: string) => {
  const accessToken = jwt.sign(
    { userId, tenantId },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as unknown as number }
  );
  const refreshToken = jwt.sign(
    { userId, tenantId },
    process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as unknown as number }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, businessName, website } = req.body;

    if (!name || !email || !password || !businessName) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const tenantId = uuidv4();

    // Create business
    const business = await Business.create({
      tenantId,
      name: businessName,
      email,
      website: website || '',
    });

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      role: 'business_admin',
      tenantId,
    });

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), tenantId);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        business,
        accessToken,
        refreshToken,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const business = await Business.findOne({ tenantId: user.tenantId });
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.tenantId);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        business,
        accessToken,
        refreshToken,
      },
    });
  })
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refresh-secret'
    ) as { userId: string; tenantId: string };

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }

    const tokens = generateTokens(user._id.toString(), user.tenantId);
    res.json({ success: true, data: tokens });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const business = await Business.findOne({ tenantId: req.tenantId });
    res.json({
      success: true,
      data: { user: req.user, business },
    });
  })
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });

    if (user) {
      // In production: send actual email with reset link
      console.log(`Password reset requested for: ${email}`);
    }
  })
);

export default router;
