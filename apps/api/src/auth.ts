import { Context } from 'hono';
import { verify } from 'hono/jwt';

export function getUserId(c: Context): string | null {
  const user = c.get('jwtPayload');
  if (!user || !user.sub) return null;
  return user.sub;
}

export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET || 'dev-secret-change-me');
    c.set('jwtPayload', payload);
    await next();
  } catch (e) {
    return c.json({ error: 'unauthorized' }, 401);
  }
};


