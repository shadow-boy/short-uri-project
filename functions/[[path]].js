// Debug Functions file
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    console.log('=== Functions Debug Info ===');
    console.log('Request URL:', url.pathname);
    console.log('Request method:', request.method);
    console.log('Environment variables available:', Object.keys(env));
    console.log('KV namespace available:', !!env.SHORT_URI_KV);
    console.log('JWT secret available:', !!env.JWT_SECRET);
    console.log('Admin username:', env.ADMIN_USERNAME || 'not set');
    console.log('Admin password:', env.ADMIN_PASSWORD ? 'set' : 'not set');

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

    // Debug endpoint
    if (url.pathname === '/debug') {
      return new Response(JSON.stringify({ 
        message: 'Debug information',
        path: url.pathname,
        method: request.method,
        timestamp: new Date().toISOString(),
        env: {
          hasKv: !!env.SHORT_URI_KV,
          hasJwtSecret: !!env.JWT_SECRET,
          adminUsername: env.ADMIN_USERNAME || 'not set',
          adminPassword: env.ADMIN_PASSWORD ? 'set' : 'not set',
          allEnvKeys: Object.keys(env)
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Health check
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

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Cloudflare Pages Functions are working!',
      path: url.pathname,
      method: request.method,
      timestamp: new Date().toISOString(),
      note: 'Visit /debug for detailed information'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('=== Functions Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
