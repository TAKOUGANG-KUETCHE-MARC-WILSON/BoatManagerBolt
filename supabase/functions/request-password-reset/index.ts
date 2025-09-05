// request-password-reset Edge Function
// ---------------------------------------------------
// Purpose: generate a Supabase password‑reset link
//          and send it via Resend.
// ---------------------------------------------------

// 1️⃣  Imports – only built‑in modules + supabase‑js via npm:
// -----------------------------------------------------------------
import { createClient } from "npm:@supabase/supabase-js@2.39.4";

// 2️⃣  Helpers -------------------------------------------------
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// 3️⃣  Core – generate link & send e‑mail --------------------
async function sendPasswordReset(email: string) {
  // -----------------------------------------------------------------
  // a) Build the Supabase admin client (service_role bypasses RLS)
  // -----------------------------------------------------------------
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // -----------------------------------------------------------------
  // b) Generate a one‑time recovery link
  // -----------------------------------------------------------------
  const { data, error } = await supabase.auth.admin.generateLink({
    email,
    type: "recovery",
    // Optional: force a deep‑link after Supabase handles the token
    // The `redirectTo` parameter is appended to the generated link.
    // If you have a mobile deep‑link use `myapp://reset?token={token}`.
    redirectTo: Deno.env.get("RESET_LINK_REDIRECT") ?? undefined,
  });

  if (error) {
    console.error("Supabase generateLink error:", error);
    throw new Error(error.message);
  }

  const resetLink = data?.properties?.action_link; // <-- the final URL
  if (!resetLink) {
    throw new Error("No reset link returned by Supabase");
  }

  // -----------------------------------------------------------------
  // c) Send the e‑mail via Resend
  // -----------------------------------------------------------------
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {font-family:Arial,sans-serif;line-height:1.6;color:#333;}
    .container{max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;}
    .header{background:#0066CC;color:#fff;padding:10px 20px;text-align:center;border-radius:8px 8px 0 0;}
    .content{padding:20px;}
    .button{display:inline-block;background:#0066CC;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;margin-top:20px;}
    .footer{text-align:center;margin-top:30px;font-size:.9em;color:#777;}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>Réinitialisation du mot de passe</h2></div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci‑dessous (ou copiez‑collez le lien dans votre navigateur) :</p>
      <a class="button" href="${resetLink}">Réinitialiser mon mot de passe</a>
      <p>Ce lien expirera dans 60 minutes et ne peut être utilisé qu’une seule fois.</p>
      <p>Si vous n’avez pas demandé cette action, ignorez simplement ce message.</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} Your Boat Manager</div>
  </div>
</body>
</html>`;

  const payload = {
    from: "Your Boat Manager <application@yourboatmanager.com>",
    to: [email],
    subject: "Réinitialisation du mot de passe – Your Boat Manager",
    html,
    text: `Cliquez sur le lien pour réinitialiser votre mot de passe : ${resetLink}`,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend API error:", err);
    throw new Error(err?.message ?? "Resend failed");
  }

  console.log("Password‑reset e‑mail sent", await res.json());
}

// 4️⃣  Edge Function handler -----------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Quick sanity check – if the secret is missing we return 503 so Supabase can retry.
  if (!Deno.env.get("RESEND_API_KEY")) {
    console.error("Missing RESEND_API_KEY secret");
    return new Response(JSON.stringify({ error: "Server mis‑configuration" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { email }: { email: string } = await req.json();

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid e‑mail address" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fire‑and‑forget – let the email‑sending run in the background.
    EdgeRuntime.waitUntil(sendPasswordReset(email));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in request‑password‑reset:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});