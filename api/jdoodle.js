// Vercel Serverless Function for JDoodle API execution (Bypasses browser CORS restrictions completely)
export default async function handler(req, res) {
  // Set CORS headers for our frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { clientId, clientSecret, script, language = 'java', versionIndex = '4', stdin = '' } = req.body || {};

    if (!clientId || !clientSecret || !script) {
      return res.status(400).json({ error: 'Missing required JDoodle parameters (clientId, clientSecret, script)' });
    }

    // Server-to-server fetch to JDoodle API (No browser CORS policy applies)
    const response = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script,
        language,
        versionIndex,
        stdin,
      }),
    });

    const data = await response.json().catch(() => ({ error: 'Invalid JSON response from JDoodle API' }));

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[JDoodle API Serverless Proxy Error]:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error forwarding request to JDoodle' });
  }
}
