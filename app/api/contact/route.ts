// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
// Usamos uma variável específica para não dar conflito com o sistema de NFe/Boletos
const recipientEmail = process.env.CONTACT_FORM_RECIPIENT || "lucasdarela@live.com";

export async function POST(req: Request) {
  try {
    const { name, email, message, recaptchaToken } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Por favor, preencha todos os campos obrigatórios." },
        { status: 400 },
      );
    }

    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "Validação de segurança (reCAPTCHA) ausente." },
        { status: 400 },
      );
    }

    // 1. Verifica o token no Google (v2 Invisível)
    const verifyRes = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      },
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      console.error("Erro reCAPTCHA:", verifyData["error-codes"]);
      return NextResponse.json(
        { error: "Falha na verificação de segurança. Tente novamente." },
        { status: 403 },
      );
    }

    // 2. Envia o e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `Contato Chopp Hub <contato@chopphub.com>`,
      to: [recipientEmail],
      subject: `[Site] Nova mensagem de ${name}`,
      replyTo: email,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0070f3;">Nova mensagem de contato recebida</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p><strong>Mensagem:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
            ${message.replace(/\n/g, "<br>")}
          </div>
          <p style="font-size: 12px; color: #888; margin-top: 30px;">
            Enviado via formulário de contato do site Chopp Hub.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Erro Resend:", error);
      return NextResponse.json(
        { error: "Erro ao enviar mensagem. Tente mais tarde." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro Interno API Contato:", err);
    return NextResponse.json(
      { error: "Erro inesperado no servidor." },
      { status: 500 },
    );
  }
}
