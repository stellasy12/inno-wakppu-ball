const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore('leaderboard');

  try {
    if (event.httpMethod === 'GET') {
      const { blobs } = await store.list();
      const entries = [];
      for (const b of blobs) {
        try {
          const val = await store.get(b.key, { type: 'json' });
          if (val) entries.push(val);
        } catch (e) { /* skip corrupt entry */ }
      }
      entries.sort((a, b) => (b.score || 0) - (a.score || 0));
      return { statusCode: 200, headers, body: JSON.stringify(entries.slice(0, 50)) };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid json' }) };
      }

      // simple server-side validation / sanitization so the leaderboard can't be trashed easily
      const name = String(body.name || '익명').slice(0, 10);
      const score = Math.max(0, Math.min(999999, Math.floor(Number(body.score) || 0)));
      const combo = Math.max(0, Math.min(9999, Math.floor(Number(body.combo) || 0)));
      const target = String(body.target || '').slice(0, 20);
      const tool = String(body.tool || '').slice(0, 20);

      const id = Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const entry = { name, score, combo, target, tool, ts: Date.now() };

      await store.setJSON(id, entry);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'method not allowed' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'server error' }) };
  }
};
