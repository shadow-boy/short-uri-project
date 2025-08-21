// Simple Cloudflare Pages Functions handler
export async function onRequest(context) {
  const { request } = context;
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
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Default response for all other paths
  return new Response(JSON.stringify({
    message: 'Hello from Cloudflare Pages Functions!',
    path: url.pathname,
    method: request.method,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
