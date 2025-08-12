import type { Request, Response, NextFunction } from 'express';

export interface AuthInfo {
  userId?: string | null;
}

export function getUserId(req: Request): string | null {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  // TODO: 验证 Supabase JWT，解析 sub 作为 userId
  void token;
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  (req as any).userId = uid;
  next();
}


