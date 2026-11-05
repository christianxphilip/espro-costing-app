export default {
  async fetch(request, env) {
    if (!env.APP_BASIC_AUTH) {
      return Response.json({ error: 'App login is unavailable' }, { status: 503 });
    }

    const encoder = new TextEncoder();
    const authorization = request.headers.get('Authorization') || '';
    const [supplied, expected] = await Promise.all([
      crypto.subtle.digest('SHA-256', encoder.encode(authorization)),
      crypto.subtle.digest('SHA-256', encoder.encode(`Basic ${env.APP_BASIC_AUTH}`)),
    ]);
    if (!crypto.subtle.timingSafeEqual(supplied, expected)) {
      return new Response('Sign in to ESPRO Costing.', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="ESPRO Costing", charset="UTF-8"',
          'Cache-Control': 'no-store',
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      return Response.json({ error: 'Cross-origin requests are not allowed' }, { status: 403 });
    }

    if (!env.RENDER_API_ORIGIN || !env.WORKER_API_TOKEN) {
      return Response.json({ error: 'API is unavailable' }, { status: 503 });
    }

    const upstream = new URL(env.RENDER_API_ORIGIN);
    upstream.pathname = url.pathname;
    upstream.search = url.search;
    const forwarded = new Request(upstream, request);
    forwarded.headers.delete('Authorization');
    forwarded.headers.delete('Cookie');
    forwarded.headers.delete('Cf-Access-Jwt-Assertion');
    forwarded.headers.set('X-Worker-Token', env.WORKER_API_TOKEN);
    const response = await fetch(forwarded, { redirect: 'manual' });
    const result = new Response(response.body, response);
    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  },
};
