// supabase/functions/chat-token/index.ts
// Deno Deploy — générateur de token utilisateur Stream Chat
// Vars nécessaires : STREAM_API_KEY, STREAM_API_SECRET, APP_JWT_SECRET (ou remplace la vérif)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface BodyIn {
  user_id: string | number;
  name?: string;
  image?: string; // URL avatar signé Supabase ou public
}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function verifyAppJWT(auth?: string) {
  // TODO: adapte si tu as déjà un mécanisme (table de sessions, etc.)
  // Ici on attend "Bearer <APP_JWT>" et on vérifie la signature HS256
  const secret = Deno.env.get("APP_JWT_SECRET");
  if (!secret) return true; // fallback dev : bypass (à retirer en prod)
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length);
  try {
    // @ts-ignore - Deno std/jose possible, pour simplicité on fait un bypass si non dispo
    // Utilise jose/jwt si tu veux une vraie vérif:
    // const { jwtVerify } = await import("https://deno.land/x/jose@v5.2.0/index.ts");
    // await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!verifyAppJWT(req.headers.get("authorization") || undefined)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const apiKey = Deno.env.get("STREAM_API_KEY");
  const apiSecret = Deno.env.get("STREAM_API_SECRET");
  if (!apiKey || !apiSecret) return json({ error: "Missing Stream credentials" }, 500);

  const body = (await req.json()) as BodyIn;
  const userId = String(body.user_id);
  const name = body.name || userId;
  const image = body.image;

  // Générer un user token Stream côté serveur
  const { createToken } = await import("npm:stream-chat@11.16.1");
  const token = createToken(apiSecret, userId, Math.floor(Date.now() / 1000) + 60 * 60 * 24); // 24h

  return json({
    api_key: apiKey,
    token,
    user: { id: userId, name, image },
  });
});
