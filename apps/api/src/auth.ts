import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface AuthInfo {
  userId?: string | null;
}

export function getUserId(req: Request): string | null {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // For admin-only system, return 'admin' as the user ID
    return payload?.sub === 'admin' ? 'admin' : null;
  } catch {
    return null;
  }
}

export function isAdmin(req: Request): boolean {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload?.sub === 'admin' && payload?.role === 'admin';
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  (req as any).userId = uid;
  next();
}


