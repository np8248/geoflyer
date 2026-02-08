const PROTECTED_USERS = {
  np8248: "welcome",
};

export async function onRequestPost({ request }) {
  const { username, password } = await request.json();
  const key = (username || "").trim().toLowerCase();

  if (!(key in PROTECTED_USERS)) {
    return Response.json({ ok: true });
  }

  const ok = password === PROTECTED_USERS[key];
  return Response.json({ ok });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
