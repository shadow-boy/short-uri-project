import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { getUserId, authMiddleware } from './auth';
import { v4 as uuidv4 } from 'uuid';
import { sign } from 'hono/jwt';

// Define the Link type for KV Store
export type Link = {
  id: string;
  slug: string;
  destinationUrl: string;
  ownerId: string;
  isActive: boolean;
  expiresAt?: string;
  clickLimit?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

// Define the Click type for KV Store
export type Click = {
  id: string;
  linkId: string;
  ts: string;
  ipHash?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
};

const app = new Hono<{ Bindings: { SHORT_URI_KV: KVNamespace; JWT_SECRET: string } }>();

// Add error handling middleware
app.onError((err, c) => {
  console.error('Hono error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.use('*', cors({ origin: '*', credentials: true }));

// Simple health check
app.get('/healthz', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

// Test endpoint to check if Functions are working
app.get('/test', (c) => c.json({ 
  message: 'Functions are working!',
  env: {
    hasKv: !!c.env.SHORT_URI_KV,
    hasJwtSecret: !!c.env.JWT_SECRET,
    adminUsername: c.env.ADMIN_USERNAME || 'admin (default)',
  }
}));

const AuthSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const parse = AuthSchema.safeParse(body);
    if (!parse.success) return c.json({ error: 'Invalid input' }, 400);

    const { username, password } = parse.data;
    const adminUsername = c.env.ADMIN_USERNAME || 'admin';
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin123456';

    if (username !== adminUsername || password !== adminPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const secret = c.env.JWT_SECRET || 'dev-secret-change-me';
    const payload = {
      sub: 'admin',
      username: adminUsername,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };
    const token = await sign(payload, secret);
    return c.json({ token, user: { username: adminUsername, role: 'admin' } });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

const CreateLinkSchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-_]+$/),
  destinationUrl: z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Only http(s) allowed'),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  clickLimit: z.number().int().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

// Middleware for protected routes
app.use('/api/links/*', authMiddleware);
app.use('/api/analytics/*', authMiddleware);

app.post('/api/links', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'unauthorized' }, 401);

    const body = await c.req.json();
    const parse = CreateLinkSchema.safeParse(body);
    if (!parse.success) return c.json({ error: parse.error.flatten() }, 400);

    const { slug, destinationUrl, isActive, expiresAt, clickLimit, tags } = parse.data;
    const normalizedSlug = slug.toLowerCase();

    const existing = await c.env.SHORT_URI_KV.get(`slug:${normalizedSlug}`);
    if (existing) {
      return c.json({ error: 'slug exists' }, 409);
    }

    const newLink: Link = {
      id: uuidv4(),
      slug: normalizedSlug,
      destinationUrl,
      isActive: isActive ?? true,
      expiresAt,
      clickLimit,
      tags,
      ownerId: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await c.env.SHORT_URI_KV.put(`link:${newLink.id}`, JSON.stringify(newLink));
    await c.env.SHORT_URI_KV.put(`slug:${normalizedSlug}`, newLink.id);

    return c.json(newLink, 201);
  } catch (error) {
    console.error('Create link error:', error);
    return c.json({ error: 'Failed to create link' }, 500);
  }
});

app.get('/api/links', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'unauthorized' }, 401);

    const list = await c.env.SHORT_URI_KV.list({ prefix: 'link:' });
    const links: Link[] = [];
    for (const key of list.keys) {
      const data = await c.env.SHORT_URI_KV.get(key.name);
      if (data) {
        links.push(JSON.parse(data));
      }
    }
    return c.json(links);
  } catch (error) {
    console.error('Get links error:', error);
    return c.json({ error: 'Failed to get links' }, 500);
  }
});

app.get('/api/links/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'unauthorized' }, 401);

    const data = await c.env.SHORT_URI_KV.get(`link:${id}`);
    if (!data) return c.json({ error: 'not found' }, 404);

    const link: Link = JSON.parse(data);
    if (link.ownerId !== 'admin') {
      return c.json({ error: 'forbidden' }, 403);
    }

    return c.json(link);
  } catch (error) {
    console.error('Get link error:', error);
    return c.json({ error: 'Failed to get link' }, 500);
  }
});

app.put('/api/links/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'unauthorized' }, 401);

    const body = await c.req.json();
    const UpdSchema = CreateLinkSchema.partial();
    const parsed = UpdSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const data = await c.env.SHORT_URI_KV.get(`link:${id}`);
    if (!data) return c.json({ error: 'not found' }, 404);

    const existingLink: Link = JSON.parse(data);
    if (existingLink.ownerId !== 'admin') {
      return c.json({ error: 'forbidden' }, 403);
    }

    const updatedLink = { ...existingLink, ...parsed.data, updatedAt: new Date().toISOString() };
    if (parsed.data?.slug && parsed.data.slug !== existingLink.slug) {
      await c.env.SHORT_URI_KV.delete(`slug:${existingLink.slug}`);
      await c.env.SHORT_URI_KV.put(`slug:${parsed.data.slug}`, updatedLink.id);
    }

    await c.env.SHORT_URI_KV.put(`link:${id}`, JSON.stringify(updatedLink));
    return c.json(updatedLink);
  } catch (error) {
    console.error('Update link error:', error);
    return c.json({ error: 'Failed to update link' }, 500);
  }
});

app.delete('/api/links/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'unauthorized' }, 401);

    const data = await c.env.SHORT_URI_KV.get(`link:${id}`);
    if (data) {
      const link: Link = JSON.parse(data);
      if (link.ownerId === 'admin') {
        await c.env.SHORT_URI_KV.delete(`link:${id}`);
        await c.env.SHORT_URI_KV.delete(`slug:${link.slug}`);
      }
    }
    return c.json({ ok: true });
  } catch (error) {
    console.error('Delete link error:', error);
    return c.json({ error: 'Failed to delete link' }, 500);
  }
});

app.get('/api/analytics/:linkId/basic', async (c) => {
  try {
    const { linkId } = c.req.param();
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'unauthorized' }, 401);

    const list = await c.env.SHORT_URI_KV.list({ prefix: `click:${linkId}:` });
    return c.json({ totalClicks: list.keys.length, linkId });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

app.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug').toLowerCase();

    const linkId = await c.env.SHORT_URI_KV.get(`slug:${slug}`);
    if (!linkId) return c.text('Not found', 404);

    const linkData = await c.env.SHORT_URI_KV.get(`link:${linkId}`);
    if (!linkData) return c.text('Not found', 404);

    const link: Link = JSON.parse(linkData);

    if (!link.isActive) return c.text('Not found', 404);
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return c.text('Expired', 410);

    try {
      const ua = String(c.req.header('user-agent') || '');
      const ref = String(c.req.header('referer') || '');
      const ip = String(c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || '');

      let ipHash: string | undefined;
      if (ip) {
        const ipHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
        ipHash = Array.from(new Uint8Array(ipHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const click: Click = {
        id: uuidv4(),
        linkId: link.id,
        ts: new Date().toISOString(),
        userAgent: ua,
        referrer: ref,
        ipHash,
        country: c.req.header('cf-ipcountry') || undefined,
      };

      c.executionCtx.waitUntil(
        c.env.SHORT_URI_KV.put(`click:${link.id}:${click.id}`, JSON.stringify(click))
      );
    } catch(e) {
      console.error("Failed to save click", e);
    }

    return c.redirect(link.destinationUrl, 302);
  } catch (error) {
    console.error('Redirect error:', error);
    return c.text('Internal server error', 500);
  }
});

export default app;

// Export for Cloudflare Pages Functions
export const onRequest = app.fetch;


