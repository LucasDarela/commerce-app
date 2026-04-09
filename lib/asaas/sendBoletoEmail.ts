// lib/asaas/sendBoletoEmail.ts
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM =
  process.env.BOLETO_EMAIL_FROM ?? "Chopp Hub <no-reply@chopphub.com>";

export type BoletoReminderType = "emission" | "3d_before" | "today" | "3d_after";

/**
 * Envia por email o boleto do Asaas para o cliente.
 * Idempotente: se já foi enviado o lembrete específico, retorna sem reenviar.
 */
export async function sendBoletoEmailIfReady(
  orderId: string,
  companyId: string,
  supabase: SupabaseClient,
  reminderType: BoletoReminderType = "emission"
): Promise<{ sent: boolean; reason?: string }> {
  console.log(`[sendBoletoEmail] [${reminderType}] Iniciando processo para orderId: ${orderId}`);
  try {
    // 1. Definição da coluna de controle baseada no tipo
    const typeToColumn: Record<BoletoReminderType, string> = {
      emission: "boleto_email_sent_at",
      "3d_before": "reminder_3d_before_sent_at",
      today: "reminder_today_sent_at",
      "3d_after": "reminder_3d_after_sent_at",
    };
    const statusColumn = typeToColumn[reminderType];

    // 2. Busca os dados do pedido (listamos todas as colunas explicitamente para evitar erro de parse do TS)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, total, boleto_url, boleto_digitable_line, due_date, customer_id, customer, note_number, payment_status, boleto_email_sent_at, reminder_3d_before_sent_at, reminder_today_sent_at, reminder_3d_after_sent_at"
      )
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (orderErr || !order) {
      console.warn("[sendBoletoEmail] Pedido não encontrado ou erro:", orderErr?.message);
      return { sent: false, reason: "order_not_found" };
    }

    // 3. Idempotência: Já enviamos esse tipo específico de lembrete?
    if ((order as any)[statusColumn]) {
      console.log(`[sendBoletoEmail] [${reminderType}] Já enviado anteriormente em: ${(order as any)[statusColumn]}`);
      return { sent: false, reason: "already_sent" };
    }

    // 4. Se for lembrete de atraso ou hoje, só envia se ainda não estiver pago
    if (reminderType !== "emission" && order.payment_status === "Paid") {
      console.log(`[sendBoletoEmail] [${reminderType}] Pedido já está pago, pulando lembrete.`);
      return { sent: false, reason: "already_paid" };
    }

    // 5. Verifica se tem os dados do boleto
    if (!order.boleto_url) {
      console.warn("[sendBoletoEmail] Boleto sem URL no banco de dados.");
      return { sent: false, reason: "no_boleto_url" };
    }

    // 6. Busca email do cliente
    if (!order.customer_id) {
      console.warn("[sendBoletoEmail] Pedido sem customer_id.");
      return { sent: false, reason: "no_customer_id" };
    }

    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("email, name")
      .eq("id", order.customer_id)
      .maybeSingle();

    if (custErr || !customer?.email?.trim()) {
      console.warn("[sendBoletoEmail] Cliente sem email ou erro ao buscar:", custErr?.message);
      return { sent: false, reason: "no_customer_email" };
    }

    // 7. Busca dados da empresa
    const { data: company } = await supabase
      .from("companies")
      .select("trade_name, corporate_name")
      .eq("id", companyId)
      .maybeSingle();

    const companyName =
      company?.trade_name || company?.corporate_name || "sua empresa";

    const valorFormatado = order.total
      ? `R$ ${Number(order.total).toFixed(2)}`
      : "—";

    const dataVencimento = order.due_date
      ? new Date(order.due_date + "T12:00:00").toLocaleDateString("pt-BR")
      : "—";

    const orderRef = order.note_number ? `#${order.note_number}` : `ID ${order.id.slice(0, 8)}`;

    // 8. Assunto e Título baseados no tipo
    const typeConfigs: Record<BoletoReminderType, { subject: string; title: string; color: string }> = {
      emission: {
        subject: `Boleto Bancário — ${companyName} (${orderRef})`,
        title: "🎟️ Boleto Disponível",
        color: "#1e3e62",
      },
      "3d_before": {
        subject: `Lembrete de Vencimento — ${companyName} (${orderRef})`,
        title: "📅 Vencimento em 3 dias",
        color: "#2563eb",
      },
      today: {
        subject: `Vence Hoje — ${companyName} (${orderRef})`,
        title: "⚠️ Vence Hoje",
        color: "#dc2626",
      },
      "3d_after": {
        subject: `Boleto Vencido — ${companyName} (${orderRef})`,
        title: "🚨 Aviso de Atraso",
        color: "#991b1b",
      },
    };

    const config = typeConfigs[reminderType];

    // 9. Monta e envia o email
    const html = buildBoletoEmailHtml({
      customerName: customer.name || order.customer || "Cliente",
      companyName,
      orderRef,
      valorFormatado,
      dataVencimento,
      boletoUrl: order.boleto_url,
      digitableLine: order.boleto_digitable_line,
      typeConfig: config,
      isOverdue: reminderType === "3d_after",
    });

    const { error: resendErr } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [customer.email.trim()],
      subject: config.subject,
      html,
    });

    if (resendErr) {
      console.error("[sendBoletoEmail] Erro Resend:", resendErr);
      return { sent: false, reason: "resend_error" };
    }

    // 10. Marca como enviado na coluna correta
    await supabase
      .from("orders")
      .update({ [statusColumn]: new Date().toISOString() })
      .eq("id", orderId);

    return { sent: true };
  } catch (err: any) {
    console.error("[sendBoletoEmail] Erro inesperado:", err?.message ?? err);
    return { sent: false, reason: "unexpected_error" };
  }
}

function buildBoletoEmailHtml({
  customerName,
  companyName,
  orderRef,
  valorFormatado,
  dataVencimento,
  boletoUrl,
  digitableLine,
  typeConfig,
  isOverdue,
}: {
  customerName: string;
  companyName: string;
  orderRef: string;
  valorFormatado: string;
  dataVencimento: string;
  boletoUrl: string;
  digitableLine: string | null;
  typeConfig: { title: string; color: string };
  isOverdue: boolean;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${typeConfig.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${typeConfig.color};padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">${typeConfig.title}</p>
              <p style="margin:6px 0 0;font-size:14px;color:#f1f5f9;opacity:0.9;">Pedido ${orderRef} • ${companyName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333333;">
                Olá, <strong>${customerName}</strong>!
              </p>
              
              <p style="margin:0 0 24px;font-size:14px;color:#555555;line-height:1.6;">
                ${
                  isOverdue
                    ? `Identificamos que o boleto referente ao seu pedido na <strong>${companyName}</strong> ainda não teve o pagamento confirmado. Caso já tenha realizado o pagamento, favor desconsiderar este e-mail.`
                    : `Lembramos que o boleto referente ao seu pedido na <strong>${companyName}</strong> está disponível para pagamento.`
                }
              </p>

              <!-- Resumo -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;margin-bottom:24px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:16px;border-right:1px solid #e2e8f0;width:50%;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Valor</p>
                    <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#1e3e62;">${valorFormatado}</p>
                  </td>
                  <td style="padding:16px;width:50%;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Vencimento</p>
                    <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:${isOverdue ? "#991b1b" : "#dc2626"};">${dataVencimento}</p>
                  </td>
                </tr>
              </table>

              <!-- Action -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${boletoUrl}"
                   target="_blank"
                   style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 32px;border-radius:8px;box-shadow:0 4px 6px rgba(37,99,235,0.2);">
                  💳 Visualizar / Pagar Boleto
                </a>
              </div>

              ${
                digitableLine
                  ? `<!-- Copia e Cola -->
              <div style="background-color:#fffbeb;border:1px dashed #f59e0b;border-radius:6px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#92400e;text-transform:uppercase;">Linha Digitável (Copia e Cola)</p>
                <p style="margin:0;font-family:monospace;font-size:14px;color:#78350f;word-break:break-all;background:#ffffff;padding:8px;border-radius:4px;border:1px solid #fde68a;">
                  ${digitableLine}
                </p>
              </div>`
                  : ""
              }

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Dica: O pagamento pode ser feito via aplicativo do seu banco, internet banking ou agências lotéricas.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f1f5f9;padding:24px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
                Este e-mail foi enviado automaticamente através da plataforma <strong>Chopp Hub</strong> a pedido de <strong>${companyName}</strong>.<br/>
                Por favor, não responda a este e-mail.
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
