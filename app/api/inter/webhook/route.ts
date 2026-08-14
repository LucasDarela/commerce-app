import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

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

    const supabase = await createRouteSupabaseClient();

    // ─── Extrair dados do payload Inter ──────────────────────────────────────
    // O Inter envia: { codigoSolicitacao, nossoNumero, situacao, valorTotal,
    //                  dataVencimento, linhaDigitavel, codigoBarras, ... }
    const {
      codigoSolicitacao,
      situacao,
      valorTotal,
      linhaDigitavel,
      codigoBarras,
      dataVencimento,
      dataPagamento,
      valorPago,
      pixCopiaECola,
      linkVisualizacao,
    } = body;

    if (!codigoSolicitacao) {
      console.warn("[Inter Webhook] Sem codigoSolicitacao no payload");
      return NextResponse.json({ ok: true }); // Ack sem processar
    }

    // ─── Buscar order pelo boleto_id ──────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, company_id, payment_status")
      .eq("boleto_id", codigoSolicitacao)
      .maybeSingle();

    if (orderErr) {
      console.error("[Inter Webhook] Erro ao buscar order:", orderErr.message);
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    if (!order) {
      console.warn("[Inter Webhook] Order não encontrada para codigoSolicitacao:", codigoSolicitacao);
      // Retorna 200 para o Inter não retentar
      return NextResponse.json({ ok: true });
    }

    // ─── Mapear situação Inter → payment_status interno ───────────────────────
    // Situações Inter: EMABERTO, PAGO, CANCELADO, EXPIRADO, VENCIDO
    const statusMap: Record<string, string> = {
      EMABERTO: "Unpaid",
      PAGO: "Paid",
      CANCELADO: "Cancelled",
      EXPIRADO: "Expired",
      VENCIDO: "Overdue",
    };

    const newStatus = statusMap[situacao] ?? order.payment_status;

    const update: Record<string, any> = {
      payment_status: newStatus,
    };

    // Atualiza linha digitável / código de barras se vieram no webhook
    if (linhaDigitavel) update.boleto_digitable_line = linhaDigitavel;
    if (codigoBarras) update.boleto_barcode_number = codigoBarras;
    if (linkVisualizacao) update.boleto_url = linkVisualizacao;

    if (situacao === "PAGO") {
      if (dataPagamento) update.paid_at = dataPagamento;
      if (valorPago != null) update.amount_paid = valorPago;
    }

    const { error: updErr } = await supabase
      .from("orders")
      .update(update)
      .eq("id", order.id);

    if (updErr) {
      console.error("[Inter Webhook] Erro ao atualizar order:", updErr.message);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    console.log(
      `[Inter Webhook] Order ${order.id} atualizada → status: ${newStatus}`,
    );

    // Se acabou de receber a linha digitável e o e-mail ainda não foi enviado,
    // podemos tentar disparar agora
    if (linhaDigitavel && newStatus === "Unpaid") {
      try {
        const { sendBoletoEmailIfReady } = await import(
          "@/lib/asaas/sendBoletoEmail"
        );
        await sendBoletoEmailIfReady(order.id, order.company_id, supabase);
      } catch (err) {
        console.error("[Inter Webhook] Erro ao disparar e-mail boleto:", err);
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
