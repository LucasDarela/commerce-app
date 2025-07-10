// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const toEmail = process.env.RESEND_TO_EMAIL;

export async function POST(req: Request) {
  const { name, email, message, recaptchaToken } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Campos obrigatórios ausentes" },
      { status: 400 },
    );
  }

  if (!recaptchaToken) {
    return NextResponse.json({ error: "reCAPTCHA ausente" }, { status: 400 });
  }

  // Verifica o token no Google
  const verifyRes = await fetch(
    `https://www.google.com/recaptcha/api/siteverify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    },
  );

  const verifyData = await verifyRes.json();

  if (!verifyData.success || (verifyData.score && verifyData.score < 0.5)) {
    return NextResponse.json(
      { error: "Falha na verificação do reCAPTCHA" },
      { status: 403 },
    );
  }

  try {
    await resend.emails.send({
      from: `Contato Website <no-reply@onresend.com>`,
      to: [toEmail!],
      subject: "Nova mensagem de contato",
      replyTo: email,
      html: `
        <h2>Nova mensagem de contato</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Mensagem:</strong><br>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    return NextResponse.json(
      { error: "Erro ao enviar e-mail" },
      { status: 500 },
    );
  }
}
