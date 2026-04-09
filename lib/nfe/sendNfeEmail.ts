// lib/nfe/sendNfeEmail.ts
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM =
  process.env.NFE_EMAIL_FROM ?? "Chopp Hub <no-reply@chopphub.com>";

/**
 * Envia por email o DANFE e XML de uma NF-e autorizada para o cliente
 * cadastrado no pedido. Totalmente idempotente: se já foi enviado
 * (nfe_email_sent_at preenchido), retorna sem reenviar.
 *
 * Silenciosamente ignora se:
 *  - NF-e não está autorizada
 *  - links DANFE/XML ainda não estão disponíveis
 *  - cliente não possui email cadastrado
 */
export async function sendNfeEmailIfReady(
  invoiceId: string,
  companyId: string,
  supabase: SupabaseClient,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    // 1. Busca a invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select(
        "id, order_id, numero, serie, valor_total, danfe_url, xml_url, status, customer_name, nfe_email_sent_at",
      )
      .eq("id", invoiceId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (invErr || !invoice) {
      console.warn("[sendNfeEmail] Invoice não encontrada:", invErr?.message);
      return { sent: false, reason: "invoice_not_found" };
    }

    // 2. Idempotência — já enviado?
    if (invoice.nfe_email_sent_at) {
      return { sent: false, reason: "already_sent" };
    }

    // 3. Só envia se estiver autorizada
    const isAuth = (invoice.status ?? "").toLowerCase().includes("autorizad");
    if (!isAuth) {
      return { sent: false, reason: "not_authorized" };
    }

    // 4. Só envia se tiver ambos os links
    if (!invoice.danfe_url || !invoice.xml_url) {
      return { sent: false, reason: "links_not_ready" };
    }

    // 5. Busca email do cliente via order → customers
    if (!invoice.order_id) {
      return { sent: false, reason: "no_order_id" };
    }

    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("id", invoice.order_id)
      .maybeSingle();

    if (orderErr || !orderRow?.customer_id) {
      return { sent: false, reason: "no_customer_id" };
    }

    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("email, name")
      .eq("id", orderRow.customer_id)
      .maybeSingle();

    if (custErr || !customer?.email?.trim()) {
      // Sem email cadastrado — ignora silenciosamente
      return { sent: false, reason: "no_customer_email" };
    }

    // 6. Busca nome da empresa emitente
    const { data: company } = await supabase
      .from("companies")
      .select("trade_name, corporate_name")
      .eq("id", companyId)
      .maybeSingle();

    const companyName =
      company?.trade_name || company?.corporate_name || "sua empresa";

    const numeroNfe = invoice.numero
      ? `NF-e nº ${invoice.numero}${invoice.serie ? ` (Série ${invoice.serie})` : ""}`
      : "NF-e";

    const valorFormatado = invoice.valor_total
      ? `R$ ${Number(invoice.valor_total).toFixed(2)}`
      : null;

    // 7. Monta e envia o email
    const html = buildEmailHtml({
      customerName: customer.name || invoice.customer_name || "Cliente",
      companyName,
      numeroNfe,
      valorFormatado,
      danfeUrl: invoice.danfe_url,
      xmlUrl: invoice.xml_url,
    });

    const { error: resendErr } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [customer.email.trim()],
      subject: `${numeroNfe} — ${companyName}`,
      html,
    });

    if (resendErr) {
      console.error("[sendNfeEmail] Erro ao enviar via Resend:", resendErr);
      return { sent: false, reason: "resend_error" };
    }

    // 8. Marca como enviado para garantir idempotência
    await supabase
      .from("invoices")
      .update({ nfe_email_sent_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .eq("company_id", companyId);

    console.log(
      `[sendNfeEmail] Email da ${numeroNfe} enviado para ${customer.email}`,
    );
    return { sent: true };
  } catch (err: any) {
    console.error("[sendNfeEmail] Erro inesperado:", err?.message ?? err);
    return { sent: false, reason: "unexpected_error" };
  }
}

// ─── Template HTML ────────────────────────────────────────────────────────────

function buildEmailHtml({
  customerName,
  companyName,
  numeroNfe,
  valorFormatado,
  danfeUrl,
  xmlUrl,
}: {
  customerName: string;
  companyName: string;
  numeroNfe: string;
  valorFormatado: string | null;
  danfeUrl: string;
  xmlUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${numeroNfe}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e3a5f;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;">📄 ${numeroNfe}</p>
              <p style="margin:6px 0 0;font-size:14px;color:#a8c4e0;">${companyName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333333;">
                Olá, <strong>${customerName}</strong>!
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#555555;line-height:1.6;">
                Sua Nota Fiscal Eletrônica foi <strong>autorizada pela SEFAZ</strong> e está disponível para download nos links abaixo.
              </p>

              ${
                valorFormatado
                  ? `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:13px;color:#666;">Valor total da nota</p>
                    <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#1e3a5f;">${valorFormatado}</p>
                  </td>
                </tr>
              </table>`
                  : ""
              }

              <!-- Buttons -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${danfeUrl}"
                       target="_blank"
                       style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:6px;">
                      📥 Baixar DANFE (PDF)
                    </a>
                  </td>
                  <td>
                    <a href="${xmlUrl}"
                       target="_blank"
                       style="display:inline-block;background-color:#ffffff;color:#2563eb;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:6px;border:2px solid #2563eb;">
                      📄 Baixar XML
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
                Se os botões não funcionarem, copie e cole os links diretamente no navegador:<br/>
                DANFE: <a href="${danfeUrl}" style="color:#2563eb;">${danfeUrl}</a><br/>
                XML: <a href="${xmlUrl}" style="color:#2563eb;">${xmlUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Este email foi enviado automaticamente por <strong>${companyName}</strong>.<br/>
                Por favor, não responda a este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
