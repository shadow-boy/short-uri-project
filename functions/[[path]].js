// Simple Cloudflare Pages Functions handler
export async function onRequest(context) {
  return new Response(JSON.stringify({
    message: 'Hello from Cloudflare Pages Functions!',
    timestamp: new Date().toISOString(),
    working: true
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
