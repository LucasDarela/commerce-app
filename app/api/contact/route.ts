// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
// Usamos uma variável específica para não dar conflito com o sistema de NFe/Boletos
const recipientEmail =
  process.env.CONTACT_FORM_RECIPIENT || "lucasdarela@live.com";

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
      from: `Chopp Hub Contato <suporte@chopphub.com>`,
      to: [recipientEmail],
      subject: `Mensagem de ${name} - Contato Site`,
      replyTo: email,
      text: `Nova mensagem de contato:\n\nNome: ${name}\nE-mail: ${email}\nMensagem: ${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #0070f3; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Nova Mensagem do Website</h2>
          <p style="font-size: 16px;">Você recebeu uma nova mensagem através do formulário de contato.</p>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 100px;">Nome:</td>
              <td style="padding: 8px 0;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">E-mail:</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #0070f3; font-style: italic;">
            ${message.replace(/\n/g, "<br>")}
          </div>

          <p style="font-size: 11px; color: #999; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
            Este é um e-mail automático enviado pelo sistema Chopp Hub.
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
