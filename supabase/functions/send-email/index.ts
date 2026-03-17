import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend";
import React from "npm:react";
import { render } from "npm:@react-email/render";

import ConfirmSignupEmail from "./_templates/confirm-signup-email.tsx";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SEND_EMAIL_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const EMAIL_FROM =
  Deno.env.get("EMAIL_FROM") ?? "Chopp Hub <no-reply@chopphub.com>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://chopphub.com";

if (!RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

if (!SEND_EMAIL_HOOK_SECRET) {
  throw new Error("Missing SEND_EMAIL_HOOK_SECRET");
}

const resend = new Resend(RESEND_API_KEY);
const hookSecret = SEND_EMAIL_HOOK_SECRET.replace("v1,whsec_", "");

Deno.serve(async (req) => {
  console.log("[send-email] request received");

  try {
    const payload = await req.text();

    const headers = {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    };

    console.log("[send-email] verifying webhook");

    const wh = new Webhook(hookSecret);
    const {
      user,
      email_data: { token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email?: string;
        user_metadata?: { name?: string };
      };
      email_data: {
        token_hash: string;
        redirect_to?: string;
        email_action_type: string;
      };
    };

    console.log("[send-email] webhook verified");
    console.log("[send-email] action:", email_action_type);
    console.log("[send-email] redirect_to:", redirect_to ?? null);

    const email = user?.email;
    if (!email) {
      console.error("[send-email] missing email in payload");
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[send-email] recipient:", email);

    const baseUrl = redirect_to || SITE_URL;

    let subject = "Chopp Hub";
    let html = "";

    if (email_action_type === "signup") {
      const confirmUrl = `${baseUrl}/auth/callback?token_hash=${token_hash}&type=signup&next=/marketing/registration-confirmed`;

      subject = "Confirme seu cadastro";
      html = await render(
        React.createElement(ConfirmSignupEmail, {
          userName: user?.user_metadata?.name,
          confirmUrl,
        })
      );
    } else if (email_action_type === "invite") {
      const inviteUrl = `${baseUrl}/auth/callback?token_hash=${token_hash}&type=invite&next=/set-password`;

      subject = "Você foi convidado para acessar o Chopp Hub";
      html = await render(
        React.createElement(ConfirmSignupEmail, {
          userName: user?.user_metadata?.name,
          confirmUrl: inviteUrl,
        })
      );
    } else if (email_action_type === "recovery") {
      const recoveryUrl = `${baseUrl}/auth/callback?token_hash=${token_hash}&type=recovery&next=/set-password`;

      subject = "Redefina sua senha";
      html = await render(
        React.createElement(ConfirmSignupEmail, {
          userName: user?.user_metadata?.name,
          confirmUrl: recoveryUrl,
        })
      );
    } else {
      console.log("[send-email] fallback template for action:", email_action_type);
      html = `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>Chopp Hub</h1>
          <p>Seu link está pronto.</p>
        </div>
      `;
    }

    console.log("[send-email] sending email");
    console.log("[send-email] from:", EMAIL_FROM);
    console.log("[send-email] subject:", subject);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error("[send-email] resend error:", JSON.stringify(error, null, 2));
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[send-email] email sent successfully:", JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-email] fatal error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});