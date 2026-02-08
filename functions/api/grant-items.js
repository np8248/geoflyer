const ADMIN_SECRET = 'capybara-grant-2026';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const username = (url.searchParams.get('username') || '').trim().toLowerCase();
    if (!username) {
      return new Response(JSON.stringify({ skins: [], trails: [] }), { headers });
    }
    const grants = await context.env.LEADERBOARD.get('user-grants', 'json') || {};
    const userGrants = grants[username] || { skins: [], trails: [] };
    return new Response(JSON.stringify({ skins: userGrants.skins || [], trails: userGrants.trails || [] }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ skins: [], trails: [], error: 'Failed to load grants' }), { headers, status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { username, skins, trails, secret } = body;

    if (!secret || secret !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers, status: 403 });
    }

    if (!username || typeof username !== 'string' || username.trim().length < 1) {
      return new Response(JSON.stringify({ error: 'Username is required' }), { headers, status: 400 });
    }

    const trimmed = username.trim().toLowerCase();
    const grants = await context.env.LEADERBOARD.get('user-grants', 'json') || {};

    if (!grants[trimmed]) {
      grants[trimmed] = { skins: [], trails: [] };
    }

    if (Array.isArray(skins)) {
      skins.forEach(s => {
        if (typeof s === 'number' && !grants[trimmed].skins.includes(s)) {
          grants[trimmed].skins.push(s);
        }
      });
    }

    if (Array.isArray(trails)) {
      trails.forEach(t => {
        if (typeof t === 'number' && !grants[trimmed].trails.includes(t)) {
          grants[trimmed].trails.push(t);
        }
      });
    }

    await context.env.LEADERBOARD.put('user-grants', JSON.stringify(grants));

    return new Response(JSON.stringify(grants[trimmed]), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to grant items' }), { headers, status: 500 });
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
