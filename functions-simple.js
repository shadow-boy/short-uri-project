// Complete Short URI API for Cloudflare Pages Functions
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Health check endpoint
  if (url.pathname === '/healthz') {
    return new Response(JSON.stringify({
      ok: true,
      timestamp: new Date().toISOString(),
      functions: 'working'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Test endpoint
  if (url.pathname === '/test') {
    return new Response(JSON.stringify({
      message: 'Cloudflare Pages Functions are working!',
      path: url.pathname,
      method: request.method,
      timestamp: new Date().toISOString(),
      env: {
        hasKv: !!env.SHORT_URI_KV,
        hasJwtSecret: !!env.JWT_SECRET,
        adminUsername: env.ADMIN_USERNAME || 'admin (default)'
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Helper function to generate JWT
  async function generateJWT(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const data = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${data}.${encodedSignature}`;
  }

  // Helper function to verify JWT
  async function verifyJWT(token, secret) {
    try {
      const [header, payload, signature] = token.split('.');
      const data = `${header}.${payload}`;
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const expectedSignature = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const valid = await crypto.subtle.verify('HMAC', key, expectedSignature, new TextEncoder().encode(data));
      if (!valid) return null;
      const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) return null;
      return decodedPayload;
    } catch {
      return null;
    }
  }

  // Helper function to get user from request
  async function getUserFromRequest(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET || 'dev-secret-change-me';
    return await verifyJWT(token, secret);
  }

  // Helper function to generate UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Login endpoint
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { username, password } = body;
      
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Username and password required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const adminUsername = env.ADMIN_USERNAME || 'admin';
      const adminPassword = env.ADMIN_PASSWORD || 'admin123456';

      if (username !== adminUsername || password !== adminPassword) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const secret = env.JWT_SECRET || 'dev-secret-change-me';
      const payload = {
        sub: 'admin',
        username: adminUsername,
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
      };
      
      const token = await generateJWT(payload, secret);
      return new Response(JSON.stringify({ 
        token, 
        user: { username: adminUsername, role: 'admin' } 
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Login failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // Get all links
  if (url.pathname === '/api/links' && request.method === 'GET') {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const list = await env.SHORT_URI_KV.list({ prefix: 'link:' });
      const links = [];
      for (const key of list.keys) {
        const data = await env.SHORT_URI_KV.get(key.name);
        if (data) {
          links.push(JSON.parse(data));
        }
      }
      return new Response(JSON.stringify(links), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to get links' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // Create new link
  if (url.pathname === '/api/links' && request.method === 'POST') {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const body = await request.json();
      const { slug, destinationUrl } = body;

      if (!slug || !destinationUrl) {
        return new Response(JSON.stringify({ error: 'Slug and destination URL required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Check if slug already exists
      const existing = await env.SHORT_URI_KV.get(`slug:${slug.toLowerCase()}`);
      if (existing) {
        return new Response(JSON.stringify({ error: 'Slug already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const newLink = {
        id: generateUUID(),
        slug: slug.toLowerCase(),
        destinationUrl,
        ownerId: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await env.SHORT_URI_KV.put(`link:${newLink.id}`, JSON.stringify(newLink));
      await env.SHORT_URI_KV.put(`slug:${newLink.slug}`, newLink.id);

      return new Response(JSON.stringify(newLink), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to create link' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // Handle slug redirects (only for non-API, non-asset paths)
  if (url.pathname.startsWith('/') && url.pathname !== '/') {
    const slug = url.pathname.substring(1).toLowerCase();
    
    // Skip API routes and static assets
    if (slug.startsWith('api/') || slug === 'healthz' || slug === 'test' || 
        slug.startsWith('assets/') || slug.includes('.')) {
      // Let Cloudflare Pages handle static assets and API routes
      return env.ASSETS.fetch(request);
    }

    try {
      const linkId = await env.SHORT_URI_KV.get(`slug:${slug}`);
      if (!linkId) {
        return new Response('Short link not found', { status: 404 });
      }

      const linkData = await env.SHORT_URI_KV.get(`link:${linkId}`);
      if (!linkData) {
        return new Response('Short link not found', { status: 404 });
      }

      const link = JSON.parse(linkData);
      if (!link.isActive) {
        return new Response('Short link is inactive', { status: 404 });
      }

      // Log the click (optional)
      try {
        const clickId = generateUUID();
        const click = {
          id: clickId,
          linkId: link.id,
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || '',
          referrer: request.headers.get('referer') || '',
          ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || ''
        };
        // Don't await this to avoid slowing down the redirect
        env.SHORT_URI_KV.put(`click:${link.id}:${clickId}`, JSON.stringify(click));
      } catch (e) {
        // Ignore click logging errors
      }

      return Response.redirect(link.destinationUrl, 302);
    } catch (error) {
      return new Response('Internal server error', { status: 500 });
    }
  }

  // For all other paths, let Cloudflare Pages serve static files
  // This allows the frontend to be served correctly
  return env.ASSETS.fetch(request);
}
