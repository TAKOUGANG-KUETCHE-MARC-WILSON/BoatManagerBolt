import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface TriggerPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    e_mail: string;
    first_name: string;
    last_name: string;
    profile: string;
  };
  old_record: null | any;
  schema: string;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload: TriggerPayload = await req.json();
    const newUser = payload.record;

    // Envoyer uniquement pour les nouveaux pleasure_boater
    if (payload.type !== "INSERT" || newUser.profile !== "pleasure_boater") {
      console.log("Skipping email: not a new pleasure_boater");
      return new Response(JSON.stringify({ message: "Skipped" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables.");
    }

    const { e_mail, first_name, last_name } = newUser;

    const emailBody = `
      Bonjour ${first_name} ${last_name},<br><br>
      Bienvenue sur <b>Your Boat Manager</b> ! Nous sommes ravis de vous compter parmi nous.<br><br>
      Votre compte a été créé avec succès. Vous pouvez dès à présent vous connecter à l'application pour gérer vos bateaux et vos demandes de service.<br><br>
      Si vous avez des questions, n'hésitez pas à nous contacter.<br><br>
      Cordialement,<br>
      L'équipe Your Boat Manager
    `;

    // 📧 Envoi via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Your Boat Manager <onboarding@yourboatmanager.com>", // ⚠️ doit être validé dans Resend
        to: [e_mail],
        subject: "Bienvenue sur Your Boat Manager !",
        html: emailBody,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Failed to send email:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorData }),
        {
          headers: { "Content-Type": "application/json" },
          status: res.status,
        }
      );
    }

    const data = await res.json();
    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify({ message: "Welcome email sent" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
