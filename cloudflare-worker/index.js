export default {
  async fetch(request, env, ctx) {
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