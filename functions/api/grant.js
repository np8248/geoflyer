const ADMIN_SECRET = 'capybara-grant-2026';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestGet(context) {
  try {
    const data = await context.env.LEADERBOARD.get('capybara-granted', 'json');
    return new Response(JSON.stringify({ granted: data || [] }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ granted: [], error: 'Failed to load granted list' }), { headers, status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { username, secret } = body;

    if (!secret || secret !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers, status: 403 });
    }

    if (!username || typeof username !== 'string' || username.trim().length < 1) {
      return new Response(JSON.stringify({ error: 'Username is required' }), { headers, status: 400 });
    }

    const trimmed = username.trim().toLowerCase();
    let granted = await context.env.LEADERBOARD.get('capybara-granted', 'json') || [];

    if (!granted.includes(trimmed)) {
      granted.push(trimmed);
      await context.env.LEADERBOARD.put('capybara-granted', JSON.stringify(granted));
    }

    return new Response(JSON.stringify({ granted }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to grant access' }), { headers, status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
