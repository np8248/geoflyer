export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const data = await context.env.LEADERBOARD.get('top-scores', 'json');
    return new Response(JSON.stringify({ scores: data || [] }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ scores: [], error: 'Failed to load leaderboard' }), { headers, status: 500 });
  }
}

export async function onRequestPost(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await context.request.json();
    const { name, score } = body;

    // Validate name: 1-20 chars, alphanumeric + spaces
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Name is required' }), { headers, status: 400 });
    }
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 20 || !/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      return new Response(JSON.stringify({ error: 'Name must be 1-20 alphanumeric characters (spaces allowed)' }), { headers, status: 400 });
    }

    // Validate score: positive integer
    if (!Number.isInteger(score) || score <= 0) {
      return new Response(JSON.stringify({ error: 'Score must be a positive integer' }), { headers, status: 400 });
    }

    // Rate limiting: 1 submit per 5 seconds per IP
    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateKey = `rate:${ip}`;
    const lastSubmit = await context.env.LEADERBOARD.get(rateKey);
    if (lastSubmit) {
      const elapsed = Date.now() - parseInt(lastSubmit);
      if (elapsed < 5000) {
        return new Response(JSON.stringify({ error: 'Too many requests. Wait a few seconds.' }), { headers, status: 429 });
      }
    }
    await context.env.LEADERBOARD.put(rateKey, Date.now().toString(), { expirationTtl: 10 });

    // Read current scores
    let scores = await context.env.LEADERBOARD.get('top-scores', 'json') || [];

    // Check if player already has an entry
    const existing = scores.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      // Only update if new score is higher
      if (score <= existing.score) {
        const rank = scores.findIndex(s => s.name.toLowerCase() === trimmed.toLowerCase()) + 1;
        return new Response(JSON.stringify({ rank: rank <= 50 ? rank : null, scores, message: 'Existing score is higher' }), { headers });
      }
      // Remove old entry
      scores = scores.filter(s => s.name.toLowerCase() !== trimmed.toLowerCase());
    }

    // Add new entry
    scores.push({ name: trimmed, score, date: new Date().toISOString() });

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    // Keep top 50
    scores = scores.slice(0, 50);

    // Write back
    await context.env.LEADERBOARD.put('top-scores', JSON.stringify(scores));

    // Find player's rank
    const rankIdx = scores.findIndex(s => s.name.toLowerCase() === trimmed.toLowerCase());
    const rank = rankIdx >= 0 ? rankIdx + 1 : null;

    return new Response(JSON.stringify({ rank, scores }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to submit score' }), { headers, status: 500 });
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
