import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type Role = 'super_admin' | 'business_admin' | 'agent';

export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
};

export const requireSameTenat = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const { tenantId } = req.params;
  if (tenantId && req.user?.role !== 'super_admin' && req.tenantId !== tenantId) {
    res.status(403).json({ success: false, message: 'Access to this resource is forbidden' });
    return;
  }
  next();
};
