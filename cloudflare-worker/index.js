export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/stats') {
      // Parse body
      const { country, fastestPop, turnstileToken } = await request.json();
      // Verify Turnstile token
      const formData = new FormData();
      formData.append('secret', env.TURNSTILE_SECRET_KEY); // <-- Set this in wrangler.toml
      formData.append('response', turnstileToken);
      const verifyResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
      });
      const verifyData = await verifyResp.json();
      if (!verifyData.success) {
        return new Response('Invalid Turnstile token', { status: 403 });
      }
      // TODO: Store stats in KV or D1 here
      return new Response('OK');
    }
    const now = new Date().toISOString();
    const cf = request.cf || {};
    const headers = request.headers;
    const cfRay = headers.get('cf-ray') || '';
    // POP is the last 3 chars after the last dash in cf-ray
    let pop = '';
    if (cfRay && cfRay.includes('-')) {
      pop = cfRay.split('-').pop();
    }
    const country = cf.country || headers.get('cf-ipcountry') || '';
    return new Response(
      JSON.stringify({
        pop,
        timestamp: now,
        cf_ray: cfRay,
        country
      }),
      {
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
        },
      }
    );
  },
}; 