export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
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
    return fetch(forwarded, { redirect: 'manual' });
  },
};
