import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, firstname, lastname, phone, token } = await req.json();

    if (!email || !password || !token) {
      return new Response(
        JSON.stringify({ error: "email, password, and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify the prospect exists and is valid
    const { data: prospect, error: prospectError } = await supabase
      .from("client_prospects")
      .select("*")
      .eq("invitation_token", token)
      .single();

    if (prospectError || !prospect) {
      return new Response(
        JSON.stringify({ error: "Invalid invitation token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (prospect.invitation_status === "signed_up") {
      return new Response(
        JSON.stringify({ error: "already_used", message: "Cette invitation a déjà été utilisée." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry (30 days)
    if (prospect.invitation_expires_at && new Date(prospect.invitation_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "expired", message: "Ce lien d'invitation a expiré." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if email already exists in clients table
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingClient) {
      return new Response(
        JSON.stringify({ error: "already_exists", message: "Ce compte existe déjà. Essayez de vous connecter." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create or reuse auth user
    let userId: string;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        user_type: "client",
        first_name: firstname,
        last_name: lastname,
      },
    });

    if (authError) {
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        // Try to find and reuse existing auth user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "already_exists", message: "Ce compte existe déjà. Essayez de vous connecter." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update password and metadata
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: { user_type: "client", first_name: firstname, last_name: lastname },
        });
        userId = existingUser.id;
        console.log("Reused existing auth user for client:", userId);
      } else {
        throw authError;
      }
    } else {
      if (!authData.user) throw new Error("User creation failed");
      userId = authData.user.id;
      console.log("Created new client user:", userId);
    }

    // 4. Create client profile
    const { error: clientError } = await supabase
      .from("clients")
      .upsert({
        user_id: userId,
        email,
        first_name: firstname || prospect.firstname || '',
        last_name: lastname || prospect.lastname || '',
        phone: phone || prospect.phone || '',
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (clientError) {
      console.error("Client profile error:", clientError);
      // Non-blocking — the profile completion page will handle it
    }

    // 5. Update prospect status
    await supabase.from("client_prospects").update({
      invitation_status: "signed_up",
      user_id: userId,
    }).eq("id", prospect.id);

    // 6. Notify all admins
    try {
      const { data: admins } = await supabase.from("admins").select("user_id, email");
      if (admins && admins.length > 0) {
        const clientName = [firstname || prospect.firstname, lastname || prospect.lastname].filter(Boolean).join(" ") || email;
        
        // In-app notifications
        const notifications = admins.map((admin: any) => ({
          user_id: admin.user_id,
          user_type: 'admin',
          title: '🎉 Nouveau client inscrit via invitation',
          message: `${clientName} (${email}) a accepté l'invitation et créé son compte.`,
          type: 'system',
          read: false,
        }));
        await supabase.from("notifications").insert(notifications);

        // Email notifications
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          for (const admin of admins) {
            if (!admin.email) continue;
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: "TrouveTonDéménageur <noreply@trouvetondemenageur.fr>",
                  to: [admin.email],
                  subject: `🎉 Nouveau client: ${clientName}`,
                  html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;"><h2 style="color:#667eea;">Nouveau client inscrit</h2><p><strong>${clientName}</strong> (${email}) a accepté l'invitation et créé son compte client.</p><a href="https://www.trouvetondemenageur.fr/admin/dashboard/users" style="display:inline-block;background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;margin-top:10px;">Voir les utilisateurs →</a></div>`,
                }),
              });
            } catch (e) { console.error("Admin email error:", e); }
            await new Promise(r => setTimeout(r, 600));
          }
        }
      }
    } catch (e) {
      console.error("Admin notification error (non-blocking):", e);
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
