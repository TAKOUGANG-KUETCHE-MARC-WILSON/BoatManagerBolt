// supabase/functions/signup/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// MODIFICATION ICI : Changer l'importation de bcrypt
import bcrypt from "https://esm.sh/bcryptjs@2.4.3"


const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();

    const { first_name, last_name, e_mail, password } = body;
    const ports: string[] = Array.isArray(body.ports) ? body.ports : [];

    if (!first_name || !last_name || !e_mail || !password) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants (first_name, last_name, e_mail, password)." }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Hacher le mot de passe avant de l'insérer
    const hashedPassword = await bcrypt.hash(password, 10); // Accède à hash via l'objet bcrypt



    const { data: user, error } = await supabase
      .from("users")
      .insert({
        first_name,
        last_name,
        e_mail,
        password: hashedPassword, // Utiliser le mot de passe haché
        profile: "pleasure_boater", // Assurez-vous que le profil par défaut est défini
        status: "active", // Statut par défaut pour les nouveaux utilisateurs
        last_login: new Date().toISOString(), // Définir la dernière connexion initiale
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Insert user failed:", error);
      // Gérer spécifiquement l'erreur de contrainte d'unicité pour l'e-mail
      if (error.code === '23505' && error.message.includes('e_mail')) {
        return new Response(
          JSON.stringify({ error: "Un compte avec cet email existe déjà." }),
          { headers: { "Content-Type": "application/json" }, status: 409 } // 409 Conflict
        );
      }
      return new Response(
        JSON.stringify({ error: error.message || "Échec de l'insertion dans users." }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // (Optionnel) liaison user_ports
    if (ports.length > 0) {
      const rows = ports.map((port_id) => ({
        user_id: user.id,
        port_id,
        created_at: new Date().toISOString(),
      }));
      const { error: portsErr } = await supabase.from("user_ports").insert(rows);
      if (portsErr) console.error("⚠️ user_ports insert failed:", portsErr);
    }

    // Appel à send-welcome-email
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
        },
        body: JSON.stringify({
          type: "INSERT",
          table: "users",
          schema: "public",
          record: user, // Passer l'enregistrement utilisateur créé
          old_record: null,
        }),
      });
    } catch (e) {
      console.error("⚠️ send-welcome-email failed:", e);
    }

    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erreur inattendue." }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
