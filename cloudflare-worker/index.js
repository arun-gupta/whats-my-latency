export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/stats') {
      // Parse body
      const { country, fastestPop, turnstileToken, latency } = await request.json();
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
      // Store stats in D1
      if (fastestPop && latency != null) {
        await env.LATENCY_DB.prepare(
          'INSERT INTO latency_results (timestamp, region, latency) VALUES (?, ?, ?)'
        ).bind(new Date().toISOString(), fastestPop, latency).run();
      }
      return new Response('OK');
    }
    if (request.method === 'GET' && url.pathname === '/trends') {
      // Query the last 100 latency results, ordered by timestamp descending
      const { results } = await env.LATENCY_DB.prepare(
        'SELECT timestamp, region, latency FROM latency_results ORDER BY timestamp DESC LIMIT 100'
      ).all();
      return new Response(JSON.stringify(results), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }
    if (request.method === 'OPTIONS' && url.pathname === '/trigger-latency-test') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'Content-Type',
        }
      });
    }
    if (request.method === 'POST' && url.pathname === '/trigger-latency-test') {
      // Run latency tests to all endpoints (reuse scheduled handler logic)
      const ENDPOINTS = [
        { url: 'https://whats-my-latency-worker.arungupta.workers.dev', region: 'Cloudflare Edge (Your Location)' },
        { url: 'https://a0skeuxl34.execute-api.us-east-1.amazonaws.com/default/latency-use1', region: 'AWS Lambda us-east-1' },
        { url: 'https://f3lvvd2s2c.execute-api.ap-south-1.amazonaws.com/default/latency-aps1', region: 'AWS Lambda ap-south-1' },
        { url: 'https://vsrnqnedwj.execute-api.eu-central-1.amazonaws.com/default/latency-euc1', region: 'AWS Lambda eu-central-1' },
        { url: 'https://u1l64b21ql.execute-api.sa-east-1.amazonaws.com/default/latency-sae1', region: 'AWS Lambda sa-east-1' },
        { url: 'https://qcsjziee6h.execute-api.ca-central-1.amazonaws.com/default/latency-cac1', region: 'AWS Lambda ca-central-1' },
        { url: 'https://3fsen4xjk6.execute-api.us-west-1.amazonaws.com/default/latency-usw1', region: 'AWS Lambda us-west-1' },
        { url: 'https://fkvpl9lqs8.execute-api.ap-southeast-1.amazonaws.com/default/latency-apse1', region: 'AWS Lambda ap-southeast-1' },
      ];
      async function testLatency(endpoint) {
        const start = Date.now();
        let latency = null, error = null;
        try {
          await fetch(endpoint.url);
          latency = Date.now() - start;
        } catch (e) {
          latency = null;
          error = e.message;
        }
        return { region: endpoint.region, latency, timestamp: new Date().toISOString(), error };
      }
      const inserted = [];
      for (const endpoint of ENDPOINTS) {
        const result = await testLatency(endpoint);
        if (result.latency != null) {
          try {
            const dbResult = await env.LATENCY_DB.prepare(
              'INSERT INTO latency_results (timestamp, region, latency) VALUES (?, ?, ?)' 
            ).bind(result.timestamp, result.region, result.latency).run();
            result.dbOutput = dbResult;
          } catch (e) {
            result.dbError = e.message;
          }
        }
        inserted.push(result);
      }
      return new Response(JSON.stringify(inserted, null, 2), {
        status: 200,
        headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }
      });
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
  async scheduled(event, env, ctx) {
    const ENDPOINTS = [
      { url: 'https://whats-my-latency-worker.arungupta.workers.dev', region: 'Cloudflare Edge (Your Location)' },
      { url: 'https://a0skeuxl34.execute-api.us-east-1.amazonaws.com/default/latency-use1', region: 'AWS Lambda us-east-1' },
      { url: 'https://f3lvvd2s2c.execute-api.ap-south-1.amazonaws.com/default/latency-aps1', region: 'AWS Lambda ap-south-1' },
      { url: 'https://vsrnqnedwj.execute-api.eu-central-1.amazonaws.com/default/latency-euc1', region: 'AWS Lambda eu-central-1' },
      { url: 'https://u1l64b21ql.execute-api.sa-east-1.amazonaws.com/default/latency-sae1', region: 'AWS Lambda sa-east-1' },
      { url: 'https://qcsjziee6h.execute-api.ca-central-1.amazonaws.com/default/latency-cac1', region: 'AWS Lambda ca-central-1' },
      { url: 'https://3fsen4xjk6.execute-api.us-west-1.amazonaws.com/default/latency-usw1', region: 'AWS Lambda us-west-1' },
      { url: 'https://fkvpl9lqs8.execute-api.ap-southeast-1.amazonaws.com/default/latency-apse1', region: 'AWS Lambda ap-southeast-1' },
    ];

    async function testLatency(endpoint) {
      const start = Date.now();
      let latency = null;
      try {
        await fetch(endpoint.url);
        latency = Date.now() - start;
      } catch (e) {
        latency = null;
      }
      return { region: endpoint.region, latency, timestamp: new Date().toISOString() };
    }

    // Run latency tests to all endpoints every 3 minutes
    for (const endpoint of ENDPOINTS) {
      const result = await testLatency(endpoint);
      if (result.latency != null) {
        await env.LATENCY_DB.prepare(
          'INSERT INTO latency_results (timestamp, region, latency) VALUES (?, ?, ?)'
        ).bind(result.timestamp, result.region, result.latency).run();
      }
    }
  },
}; 