import { Resend } from "npm:resend";
import React from "npm:react";
import { render } from "npm:@react-email/render";

import ConfirmSignupEmail from "./_templates/confirm-signup-email.tsx";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM =
  Deno.env.get("EMAIL_FROM") ?? "Chopp Hub <no-reply@chopphub.com>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://chopphub.com";

if (!RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(RESEND_API_KEY);

function buildActionUrl({
  tokenHash,
  type,
  next,
}: {
  tokenHash: string;
  type: string;
  next: string;
}) {
  const url = new URL("/auth/callback", SITE_URL);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", next);
  return url.toString();
}

Deno.serve(async (req) => {
  console.log("[send-email] request received");

  try {
    const payload = await req.text();

    console.log("[send-email] raw payload received");

    const verified = JSON.parse(payload) as {
      user: {
        email?: string;
        user_metadata?: { name?: string };
      };
      email_data: {
        token_hash?: string;
        redirect_to?: string;
        email_action_type?: string;
      };
    };

    console.log("[send-email] payload parsed");

    const user = verified.user;
    const emailData = verified.email_data;

    const email = user?.email;
    const tokenHash = emailData?.token_hash;
    const actionType = emailData?.email_action_type;

    console.log("[send-email] actionType:", actionType ?? null);
    console.log("[send-email] recipient:", email ?? null);

    if (!email) {
      throw new Error("Missing email in webhook payload");
    }

    if (!tokenHash) {
      throw new Error("Missing token_hash in webhook payload");
    }

    if (!actionType) {
      throw new Error("Missing email_action_type in webhook payload");
    }

    let subject = "Chopp Hub";
    let html = "";

    if (actionType === "signup") {
      const confirmUrl = buildActionUrl({
        tokenHash,
        type: "signup",
        next: "/marketing/registration-confirmed",
      });

      subject = "Confirme seu cadastro";
      html = await render(
        React.createElement(ConfirmSignupEmail, {
          userName: user?.user_metadata?.name,
          confirmUrl,
        }),
      );
    } else if (actionType === "invite") {
      const inviteUrl = buildActionUrl({
        tokenHash,
        type: "invite",
        next: "/set-password",
      });

      subject = "Você foi convidado para acessar o Chopp Hub";
      html = await render(
        React.createElement(ConfirmSignupEmail, {
          userName: user?.user_metadata?.name,
          confirmUrl: inviteUrl,
        }),
      );
    } else if (actionType === "recovery") {
      const recoveryUrl = buildActionUrl({
        tokenHash,
        type: "recovery",
        next: "/set-password",
      });

      subject = "Redefina sua senha";
      html = await render(
        React.createElement(ConfirmSignupEmail, {
          userName: user?.user_metadata?.name,
          confirmUrl: recoveryUrl,
        }),
      );
    } else {
      console.log("[send-email] unknown actionType:", actionType);

      html = `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>Chopp Hub</h1>
          <p>Seu link está pronto.</p>
        </div>
      `;
    }

    console.log("[send-email] rendering done");
    console.log("[send-email] EMAIL_FROM:", EMAIL_FROM);
    console.log("[send-email] sending email...");

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error(
        "[send-email] resend error:",
        JSON.stringify(error, null, 2),
      );
      throw new Error(
        typeof error === "object" ? JSON.stringify(error) : String(error),
      );
    }

    console.log("[send-email] resend success:", JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-email] fatal error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});