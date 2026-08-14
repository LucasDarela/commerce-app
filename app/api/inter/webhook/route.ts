import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook do Banco Inter — Cobrança V3
 *
 * O Inter envia callbacks quando o status da cobrança muda
 * (ex: PAGO, CANCELADO, EXPIRADO, EMABERTO).
 *
 * Configurar no portal Inter em:
 * Integrações > Webhooks > URL: https://seudominio.com/api/inter/webhook
 *
 * O Inter usa mTLS para validar a autenticidade do callback.
 * Como validação adicional, o payload contém o codigoSolicitacao que
 * devemos cruzar com nossa tabela de orders.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    console.log("[Inter Webhook] Payload recebido:", JSON.stringify(body, null, 2));

    // Como o webhook é chamado de forma anônima pelo Banco Inter (sem cookies de sessão),
    // precisamos usar a Service Role Key para ignorar o RLS (Row Level Security)
    // e conseguir ler e atualizar a tabela de orders.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Na API v3, o webhook envia um array de cobranças. Se for objeto único, convertemos para array.
    const payloads = Array.isArray(body) ? body : [body];

    for (const payload of payloads) {
      // Suporte para payloads aninhados da API V3 (ex: { cobranca: {...}, boleto: {...}, pix: {...} })
      const cobrancaObj = payload.cobranca || payload;
      const boletoObj = payload.boleto || payload;
      const pixObj = payload.pix || payload;

      const codigoSolicitacao = cobrancaObj.codigoSolicitacao;
      const situacao = cobrancaObj.situacao;
      const linhaDigitavel = boletoObj.linhaDigitavel;
      const codigoBarras = boletoObj.codigoBarras;
      const dataHoraSituacao = cobrancaObj.dataHoraSituacao || cobrancaObj.dataSituacao;
      const valorRecebido = cobrancaObj.valorTotalRecebido || cobrancaObj.valorRecebido;
      const valorTotal = cobrancaObj.valorNominal || cobrancaObj.valorTotal;
      const linkVisualizacao = boletoObj.linkVisualizacao || payload.linkVisualizacao;

      if (!codigoSolicitacao) {
        console.warn("[Inter Webhook] Ignorando payload sem codigoSolicitacao:", JSON.stringify(payload));
        continue;
      }

      // ─── Buscar order pelo boleto_id ──────────────────────────────────────────
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id, company_id, payment_status")
        .eq("boleto_id", codigoSolicitacao)
        .maybeSingle();

      if (orderErr || !order) {
        console.warn("[Inter Webhook] Order não encontrada para codigoSolicitacao:", codigoSolicitacao);
        continue;
      }

      // ─── Mapear situação Inter → payment_status interno ───────────────────────
      // V3: A_RECEBER, RECEBIDO, MARCADO_RECEBIDO, ATRASADO, CANCELADO, EXPIRADO
      // V2 (fallback): EMABERTO, PAGO, CANCELADO, EXPIRADO, VENCIDO
      const statusMap: Record<string, string> = {
        A_RECEBER: "Unpaid",
        EMABERTO: "Unpaid",
        RECEBIDO: "Paid",
        MARCADO_RECEBIDO: "Paid",
        PAGO: "Paid",
        CANCELADO: "Cancelled",
        EXPIRADO: "Expired",
        ATRASADO: "Overdue",
        VENCIDO: "Overdue",
      };

      const newStatus = statusMap[situacao] ?? order.payment_status;

      const update: Record<string, any> = {
        payment_status: newStatus,
      };

      if (linhaDigitavel) update.boleto_digitable_line = linhaDigitavel;
      if (codigoBarras) update.boleto_barcode_number = codigoBarras;
      if (linkVisualizacao) update.boleto_url = linkVisualizacao;

      if (newStatus === "Paid") {
        if (dataHoraSituacao) update.paid_at = dataHoraSituacao;
        // API v3 usa valorRecebido, v2 usa valorPago
        const amount = valorRecebido ?? payload.valorPago ?? valorTotal;
        if (amount != null) update.amount_paid = amount;
      }

      const { error: updErr } = await supabase
        .from("orders")
        .update(update)
        .eq("id", order.id);

      if (updErr) {
        console.error("[Inter Webhook] Erro ao atualizar order:", updErr.message);
        continue;
      }

      console.log(`[Inter Webhook] Order ${order.id} atualizada → status: ${newStatus}`);

      if (linhaDigitavel && newStatus === "Unpaid") {
        try {
          const { sendBoletoEmailIfReady } = await import("@/lib/asaas/sendBoletoEmail");
          await sendBoletoEmailIfReady(order.id, order.company_id, supabase);
        } catch (err) {
          console.error("[Inter Webhook] Erro ao disparar e-mail boleto:", err);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[Inter Webhook] Erro inesperado:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro inesperado" },
      { status: 500 },
    );
  }
}
