import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import sgMail from "@sendgrid/mail";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { refId, toEmail, subject, body } = await req.json();

    // 1️⃣ Usuário autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json(
        { error: "Usuário não autenticado" },
        { status: 401 },
      );

    // 2️⃣ Pega company_id do usuário
    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!companyUser?.company_id)
      return Response.json(
        { error: "Empresa não encontrada" },
        { status: 401 },
      );

    const companyId = companyUser.company_id;

    // 3️⃣ Pega credenciais SendGrid da empresa
    const { data: creds } = await supabase
      .from("email_credentials")
      .select("sendgrid_api_key, sender_email, sender_name")
      .eq("company_id", companyId)
      .maybeSingle();
    if (!creds?.sendgrid_api_key)
      return Response.json(
        { error: "Credenciais SendGrid não encontradas" },
        { status: 401 },
      );

    sgMail.setApiKey(creds.sendgrid_api_key);

    // 4️⃣ Busca arquivos PDF e XML direto do bucket
    const pdfBucket = supabase.storage.from("nfe-files/pdf");
    const xmlBucket = supabase.storage.from("nfe-files/xml");

    const { data: pdfData, error: pdfError } = await pdfBucket.download(
      `${refId}.pdf`,
    );
    const { data: xmlData, error: xmlError } = await xmlBucket.download(
      `${refId}.xml`,
    );

    if (pdfError || xmlError) {
      return Response.json(
        { error: "Erro ao buscar arquivos no bucket", pdfError, xmlError },
        { status: 500 },
      );
    }

    const pdfBuffer = Buffer.from(await pdfData.arrayBuffer());
    const xmlBuffer = Buffer.from(await xmlData.arrayBuffer());

    // 5️⃣ Monta anexos em base64
    const attachments = [
      {
        content: pdfBuffer.toString("base64"),
        filename: `DANFE-${refId}.pdf`,
        type: "application/pdf",
        disposition: "attachment",
      },
      {
        content: xmlBuffer.toString("base64"),
        filename: `NF-e-${refId}.xml`,
        type: "application/xml",
        disposition: "attachment",
      },
    ];

    // 6️⃣ Monta e envia e-mail
    const msg = {
      to: toEmail,
      from: {
        email: creds.sender_email,
        name: creds.sender_name || "Sua Empresa",
      },
      subject: subject || `NF-e ${refId}`,
      text: body || `Segue em anexo a NF-e ${refId}.`,
      html: body || `<p>Segue em anexo a NF-e <strong>${refId}</strong>.</p>`,
      attachments,
    };

    await sgMail.send(msg);

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao enviar e-mail NF-e:", err);
    return Response.json(
      { error: "Erro interno ao enviar e-mail" },
      { status: 500 },
    );
  }
}
