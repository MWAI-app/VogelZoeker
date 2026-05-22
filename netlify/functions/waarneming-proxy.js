
// Netlify Function: waarneming.nl proxy
// Omzeilt CORS door API-aanroepen server-side te doen
// Zodra je een client_id hebt van waarneming.nl, vul die hieronder in
 
const WAARNEMING_CLIENT_ID = process.env.WAARNEMING_CLIENT_ID || 'JOUW_CLIENT_ID_HIER';
const WAARNEMING_BASE      = 'https://waarneming.nl/api/v1';
 
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
 
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
 
  const path = event.path.replace('/.netlify/functions/waarneming-proxy', '').replace('/api/waarneming', '');
 
  try {
    // ── TOKEN OPHALEN (POST /token) ──────────────────────────────────────────
    if (event.httpMethod === 'POST' && path === '/token') {
      const body = JSON.parse(event.body || '{}');
      const formData = new URLSearchParams({
        client_id:  WAARNEMING_CLIENT_ID,
        grant_type: 'password',
        email:      body.email    || '',
        password:   body.password || ''
      });
 
      const resp = await fetch(`${WAARNEMING_BASE}/oauth2/token/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formData.toString()
      });
 
      const data = await resp.json();
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify(data)
      };
    }
 
    // ── WAARNEMINGEN OPHALEN (GET /observations) ─────────────────────────────
    if (event.httpMethod === 'GET' && path.startsWith('/observations')) {
      const token = (event.headers['authorization'] || '').replace('Bearer ', '');
      if (!token) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Geen token' }) };
      }
 
      // Query parameters doorsturen
      const params = new URLSearchParams(event.queryStringParameters || {});
      const url = `${WAARNEMING_BASE}/observations/around-point/?${params.toString()}`;
 
      const resp = await fetch(url, {
        headers: {
          'Authorization':   `Bearer ${token}`,
          'Accept-Language': 'nl'
        }
      });
 
      const data = await resp.json();
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify(data)
      };
    }
 
    // ── TOKEN VERNIEUWEN ─────────────────────────────────────────────────────
    if (event.httpMethod === 'POST' && path === '/refresh') {
      const body = JSON.parse(event.body || '{}');
      const formData = new URLSearchParams({
        client_id:     WAARNEMING_CLIENT_ID,
        grant_type:    'refresh_token',
        refresh_token: body.refresh_token || ''
      });
 
      const resp = await fetch(`${WAARNEMING_BASE}/oauth2/token/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formData.toString()
      });
 
      const data = await resp.json();
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify(data)
      };
    }
 
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Onbekend endpoint' })
    };
 
  } catch (err) {
    console.error('Proxy fout:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
