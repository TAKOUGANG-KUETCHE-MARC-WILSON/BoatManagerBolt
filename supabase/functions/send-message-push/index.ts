// supabase/functions/send-message-push/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const { message_id } = await req.json();
    if (!message_id) return new Response("missing message_id", { status: 400 });

    // 1) Message + auteur
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .select(
        "id, content, file_url, conversation_id, sender_id, created_at, users:sender_id(first_name,last_name)"
      )
      .eq("id", message_id)
      .single();
    if (msgErr) throw msgErr;
    if (!msg) return new Response("OK"); // rien à pousser

    // 2) Destinataires (hors émetteur)
    const { data: members, error: memErr } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", msg.conversation_id);
    if (memErr) throw memErr;

    const recipientIds = (members ?? [])
      .map((m: any) => Number(m.user_id))
      .filter((id: number) => id !== Number(msg.sender_id));
    if (!recipientIds.length) return new Response("OK");

    // 3) Tokens Expo
    const { data: tokens, error: tokErr } = await supabase
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", recipientIds);
    if (tokErr) throw tokErr;
    if (!tokens?.length) return new Response("OK");

    // 4) Badge totals
    const { data: totals, error: totErr } = await supabase
      .from("user_badge_totals")
      .select("user_id, total_unread")
      .in("user_id", recipientIds);
    if (totErr) throw totErr;

    const badgeMap = new Map<number, number>(
      (totals ?? []).map((t: any) => [Number(t.user_id), Number(t.total_unread ?? 0)])
    );

    // 5) Texte
    const title = `${msg.users.first_name} ${msg.users.last_name}`;
    const body = msg.content ?? (msg.file_url ? "📎 Pièce jointe" : "Nouveau message");

    // 6) Envoi Expo (batch autorisé)
    const payload = tokens.map((t: any) => ({
      to: t.token,
      title,
      body,
      sound: "default",
      channelId: "messages", // doit exister dans ensureNotificationChannels()
      priority: "high",
      badge: badgeMap.get(Number(t.user_id)) ?? 1,
      data: { conversation_id: msg.conversation_id },
    }));

    const r = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Log utile pour debug
    let expoResp: unknown = null;
    try { expoResp = await r.json(); } catch {}
    console.log("expo status", r.status, expoResp);

    return new Response("OK");
  } catch (e) {
    console.error("send-message-push error:", e);
    return new Response("ERR", { status: 500 });
  }
});
