// app/api/mobile/orders/[orderId]/refresh-boleto-data/route.ts
import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "../../_utils";
import { asaasFetch } from "@/lib/asaas";

type Params = {
  params: Promise<{ orderId: string }>;
};

async function detectBoletoProvider(
  supabase: any,
  companyId: string,
): Promise<"inter" | "asaas"> {
  try {
    const { data } = await supabase
      .from("company_integrations")
      .select("provider, inter_client_id")
      .eq("company_id", companyId)
      .eq("provider", "banco_inter")
      .maybeSingle();

    if (data?.inter_client_id) return "inter";
  } catch {
    // Fallback para Asaas
  }
  return "asaas";
}

export async function POST(_: Request, { params }: Params) {
  try {
    const { orderId } = await params;

    const ctx = await getAuthenticatedContext(_);

    if (ctx.error) {
      return NextResponse.json(
        { error: ctx.error.error },
        { status: ctx.error.status },
      );
    }

    const { supabase, companyId } = ctx;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        company_id,
        note_number,
        boleto_id,
        boleto_url,
        boleto_digitable_line,
        boleto_barcode_number,
        boleto_expiration_date
      `)
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json(
        { error: orderErr.message },
        { status: 400 },
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    if (!order.boleto_id) {
      return NextResponse.json(
        { error: "Este pedido ainda não possui boleto gerado." },
        { status: 422 },
      );
    }

    const provider = await detectBoletoProvider(supabase, companyId);

    let digitableLine: string | null = order.boleto_digitable_line ?? null;
    let barcode: string | null = order.boleto_barcode_number ?? null;
    let boletoUrl: string | null = order.boleto_url ?? null;
    let expirationDate: string | null = order.boleto_expiration_date ?? null;

    // =========================================================================
    // INTER
    // =========================================================================
    if (provider === "inter") {
      try {
        const { getInterCredsForCompany, interFetch } = await import(
          "@/lib/inter"
        );
        const creds = await getInterCredsForCompany(supabase, companyId);
        const detail: any = await interFetch(
          creds,
          `/cobrancas/${order.boleto_id}`,
          { method: "GET" },
        );

        const resLinha =
          detail?.boleto?.linhaDigitavel ?? detail?.linhaDigitavel ?? null;
        const resBarras =
          detail?.boleto?.codigoBarras ?? detail?.codigoBarras ?? null;
        // O PDF do Inter é servido pela nossa rota proxy
        const resLink = `/api/inter/boleto/${order.boleto_id}/pdf`;
        const resDue =
          detail?.dataVencimento ?? detail?.boleto?.dataVencimento ?? null;

        if (resLinha) digitableLine = resLinha;
        if (resBarras) barcode = resBarras;
        if (resLink) boletoUrl = resLink;
        if (resDue) expirationDate = resDue;
      } catch (interErr: any) {
        console.warn(
          "⚠️ [refresh-boleto/inter] Falha ao consultar Inter:",
          interErr?.message || interErr,
        );
        // Continua com os dados que temos no banco
      }
    } else {
      // =========================================================================
      // ASAAS (default)
      // =========================================================================
      try {
        const payment = await asaasFetch<any>(
          supabase,
          companyId,
          `/payments/${order.boleto_id}`,
          { method: "GET" },
        );

        boletoUrl =
          payment?.bankSlipUrl ?? payment?.invoiceUrl ?? boletoUrl;
        expirationDate = payment?.dueDate ?? expirationDate;
      } catch (payErr: any) {
        console.warn(
          "⚠️ [refresh-boleto/asaas] Falha ao obter payment:",
          payErr?.message || payErr,
        );
      }

      try {
        const identification = await asaasFetch<any>(
          supabase,
          companyId,
          `/payments/${order.boleto_id}/identificationField`,
          { method: "GET" },
        );

        const newLine =
          identification?.identificationField ??
          identification?.digitableLine ??
          null;
        const newBarcode =
          identification?.barCode ??
          identification?.barcode ??
          identification?.bankSlipBarcode ??
          null;

        if (newLine) digitableLine = newLine;
        if (newBarcode) barcode = newBarcode;
      } catch (idErr: any) {
        console.warn(
          "⚠️ [refresh-boleto/asaas] Não foi possível obter identificationField:",
          idErr?.message || idErr,
        );
      }
    }

    // ── Salvar dados atualizados no banco ─────────────────────────────────────
    const updatePayload: Record<string, any> = {
      boleto_url: boletoUrl,
      boleto_digitable_line: digitableLine,
      boleto_barcode_number: barcode,
      boleto_expiration_date: expirationDate,
    };

    const { error: updErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (updErr) {
      return NextResponse.json(
        {
          error: "Boleto consultado, mas falhou ao atualizar o pedido.",
          details: updErr.message,
        },
        { status: 500 },
      );
    }

    const { data: updatedOrder, error: updatedErr } = await supabase
      .from("orders")
      .select(`
        id,
        note_number,
        boleto_id,
        boleto_url,
        boleto_digitable_line,
        boleto_barcode_number,
        boleto_expiration_date
      `)
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (updatedErr) {
      return NextResponse.json(
        {
          error: "Pedido atualizado, mas falhou ao reler os dados.",
          details: updatedErr.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        provider,
        message: "Dados do boleto atualizados com sucesso.",
        data: {
          order: updatedOrder,
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("❌ mobile refresh-boleto-data error:", err);

    return NextResponse.json(
      {
        error: err?.message || "Erro interno ao atualizar dados do boleto",
      },
      { status: 500 },
    );
  }
}