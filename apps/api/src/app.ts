import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { db } from './db';
import { links, clicks } from './schema';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';
import { getUserId } from './auth';

const app = express();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any> | any) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.get('/healthz', (_, res) => res.json({ ok: true }));
app.get('/healthz/db', asyncHandler(async (_req: Request, res: Response) => {
  // simple connectivity check
  await db.execute("select 1");
  res.json({ ok: true });
}));

const CreateLinkSchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-_]+$/),
  destinationUrl: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) allowed'),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  clickLimit: z.number().int().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

app.post('/api/links', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const parse = CreateLinkSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { slug, destinationUrl, isActive, expiresAt, clickLimit, tags } = parse.data;
  const normalizedSlug = slug.toLowerCase();
  try {
    await db.insert(links).values({
      slug: normalizedSlug,
      destinationUrl,
      isActive: isActive ?? true,
      expiresAt: expiresAt ? (new Date(expiresAt) as any) : null,
      clickLimit: clickLimit ?? null,
      tags: tags ?? null,
      ownerId: userId,
    });
    res.status(201).json({ slug });
  } catch (e: any) {
    if (e?.message?.includes('duplicate key')) return res.status(409).json({ error: 'slug exists' });
    res.status(500).json({ error: 'create failed' });
  }
}));

app.get('/api/links', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const where = userId ? eq(links.ownerId, userId as any) : undefined;
  const rows = await db.select().from(links).where(where);
  res.json(rows);
}));

app.get('/api/links/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(links)
    .where(and(eq(links.id, id as any), userId ? eq(links.ownerId, userId as any) : undefined));
  if (!rows[0]) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
}));

app.put('/api/links/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = getUserId(req);

  const UpdSchema = CreateLinkSchema.partial();
  const parsed = UpdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const setters = { ...parsed.data, updatedAt: (new Date() as any) } as any;
  if (setters.slug) setters.slug = String(setters.slug).toLowerCase();

  const result = await db
    .update(links)
    .set(setters)
    .where(and(eq(links.id, id as any), userId ? eq(links.ownerId, userId as any) : undefined));
  res.json({ ok: true, changed: (result as any)?.rowCount ?? 1 });
}));

app.delete('/api/links/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = getUserId(req);
  await db
    .delete(links)
    .where(and(eq(links.id, id as any), userId ? eq(links.ownerId, userId as any) : undefined));
  res.json({ ok: true });
}));

// 最后注册 slug 重定向（避免与 /api/* 冲突）
app.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').toLowerCase();
  if (slug === 'api' || slug === 'healthz') return res.status(404).send('Not found');
  const row = (
    await db.select().from(links).where(eq(links.slug, slug)).limit(1)
  )[0];
  if (!row || !row.isActive) return res.status(404).send('Not found');
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return res.status(410).send('Expired');

  try {
    const ua = String(req.headers['user-agent'] || '');
    const ref = String(req.headers['referer'] || req.headers['referrer'] || '');
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    await db.insert(clicks).values({
      linkId: row.id,
      userAgent: ua,
      referrer: ref,
      ipHash,
    });
  } catch {}

  res.redirect(302, row.destinationUrl);
}));

// global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status || 503;
  const message = err?.message || 'Service unavailable';
  res.status(status).json({ error: message });
});

export default app;


