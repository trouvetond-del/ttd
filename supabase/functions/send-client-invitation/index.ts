import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { email, firstname, lastname, token } = await req.json();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "Email and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://www.trouvetondemenageur.fr";
    const invitationUrl = `${appUrl}/client/invite/${token}`;
    const displayName = [firstname, lastname].filter(Boolean).join(" ") || "Bonjour";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 35px 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 16px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 13px; border-radius: 0 0 12px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
          .highlight-box { background: #EFF6FF; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .step { display: flex; align-items: flex-start; margin-bottom: 12px; }
          .step-number { background: #667eea; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-right: 12px; flex-shrink: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 26px;">🏠 Bienvenue sur TrouveTonDéménageur !</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 15px;">Votre déménagement simplifié</p>
          </div>
          <div class="content">
            <p>Bonjour ${displayName},</p>
            
            <p>Suite à notre échange, nous avons le plaisir de vous inviter à rejoindre <strong>TrouveTonDéménageur</strong> pour organiser votre déménagement en toute sérénité !</p>
            
            <p>Votre profil est déjà pré-rempli. Il ne vous reste que quelques étapes :</p>

            <div style="margin: 20px 0;">
              <div class="step">
                <span class="step-number">1</span>
                <div><strong>Vérifiez vos informations</strong> — Nom, prénom et email déjà renseignés</div>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <div><strong>Choisissez votre mot de passe</strong> — Pour accéder à votre espace</div>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <div><strong>Demandez un devis</strong> — Recevez des propositions de déménageurs vérifiés</div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Créer mon compte →</a>
            </div>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 8px;"><strong>🎬 Découvrez TTD en vidéo</strong></p>
              <p style="margin: 0 0 10px; font-size: 14px; color: #92400E;">Découvrez comment fonctionne notre plateforme et comment nous sécurisons votre déménagement :</p>
              <a href="https://www.youtube.com/watch?v=oBFzBZWohy4" style="display: inline-block; background: #EF4444; color: white !important; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">▶ Voir la vidéo de présentation</a>
            </div>

            <div class="highlight-box">
              <p style="margin: 0;"><strong>✨ Pourquoi TrouveTonDéménageur ?</strong></p>
              <ul style="margin: 10px 0 0; padding-left: 20px;">
                <li>Comparez les devis de déménageurs professionnels vérifiés</li>
                <li>Paiement 100% sécurisé avec protection anti-litiges</li>
                <li>Suivi en temps réel de votre déménagement</li>
                <li>Service client disponible à chaque étape</li>
              </ul>
            </div>

            <p style="color: #6b7280; font-size: 13px;">⏰ Ce lien est valable pendant <strong>30 jours</strong>.</p>
            
            <p style="margin-top: 25px;">
              À très bientôt !<br>
              <strong>L'équipe TrouveTonDéménageur</strong>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 TrouveTonDéménageur — Tous droits réservés</p>
            <p>Besoin d'aide ? Contactez-nous à support@trouvetondemenageur.fr</p>
            <p style="font-size: 11px; color: #9ca3af;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TrouveTonDéménageur <noreply@trouvetondemenageur.fr>",
        to: [email],
        subject: `🏠 ${displayName} — Votre invitation à rejoindre TrouveTonDéménageur`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Email sending failed: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Client invitation email sent:", result);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
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