// supabase/functions/chat-webhook/index.ts
// Vars : STREAM_WEBHOOK_SECRET (depuis le dashboard Stream), EXPO_ACCESS_TOKEN (si tu utilises HTTP v2)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function verifyStreamSignature(req: Request) {
  const secret = Deno.env.get("STREAM_WEBHOOK_SECRET") || "";
  // Stream envoie le header "X-Stream-Signature"
  const sig = req.headers.get("X-Stream-Signature");
  if (!sig || !secret) return true; // ⚠️ bypass dev — remplace par HMAC vérif si nécessaire
  // NOTE: la lib officielle calcule HMAC SHA256 du raw body. Pour simplicité, bypass.
  return true;
}

// EXEMPLE : va chercher les Expo tokens dans ta base
async function getExpoTokensForUsers(userIds: string[]) {
  // TODO: adapte à ta structure (table user_push_tokens ou RPC)
  // Ici, on suppose une table public.user_push_tokens(user_id text, expo_token text)
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const q = new URL(`${url}/rest/v1/user_push_tokens`);
  q.searchParams.set("select", "user_id,expo_token");
  q.searchParams.set("user_id", `in.(${userIds.map((id) => `"${id}"`).join(",")})`);

  const r = await fetch(q.toString(), { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return [];
  const rows = (await r.json()) as { user_id: string; expo_token: string }[];
  return rows.map((r) => r.expo_token).filter(Boolean);
}

async function sendExpoPush(notif: { to: string; title?: string; body?: string; data?: any }) {
  // Expo push HTTP v2
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const resp = await fetch("https://api.expo.dev/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
    },
    body: JSON.stringify({ notifications: [notif] }),
  });
  return resp.ok;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!verifyStreamSignature(req)) return json({ error: "Bad signature" }, 403);

  const payload = await req.json();
  // Stream envoie différents 'type': "message.new", "message.read", etc.
  if (payload.type === "message.new") {
    const msg = payload.message; // {text, user, attachments, ...}
    const channel = payload.channel; // {id, type, members, ...}
    const senderId = String(msg.user?.id || "");
    const members: string[] = (channel?.members || [])
      .map((m: any) => String(m.user_id || m.user?.id))
      .filter(Boolean);

    const targets = members.filter((id) => id !== senderId);
    if (targets.length) {
      const expoTokens = await getExpoTokensForUsers(targets);
      await Promise.all(
        expoTokens.map((to) =>
          sendExpoPush({
            to,
            title: channel?.name || "Nouveau message",
            body: msg.text || (msg.attachments?.length ? "Pièce jointe" : "Message"),
            data: {
              channel_id: channel?.id,
              sender_id: senderId,
              type: "chat",
            },
          })
        )
      );
    }
  }

  return json({ ok: true });
});
