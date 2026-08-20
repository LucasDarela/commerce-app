import { NextResponse } from "next/server";
import { asaasFetch } from "@/lib/asaas";
import {
  getAuthenticatedContext,
  normalizePaymentMethod,
  parseDateToYmd,
  plusDays,
} from "../../_utils";
import { sendBoletoEmailIfReady } from "@/lib/asaas/sendBoletoEmail";
import {
  getInterCredsForCompany,
  createInterCobranca,
  type InterCobranca,
} from "@/lib/inter";
import {
  getSicoobCredsForCompany,
  createSicoobBoleto,
  type SicoobBoleto,
} from "@/lib/sicoob";

type Params = {
  params: Promise<{ orderId: string }>;
};

// ── Detecta qual provider está configurado para a empresa ─────────────────────
async function detectBoletoProvider(
  supabase: any,
  companyId: string,
): Promise<"sicoob" | "inter" | "asaas"> {
  try {
    const { data } = await supabase
      .from("company_integrations")
      .select("provider, inter_client_id, sicoob_client_id")
      .eq("company_id", companyId)
      .in("provider", ["banco_inter", "sicoob"]);

    if (Array.isArray(data)) {
      const sicoob = data.find((r: any) => r.provider === "sicoob" && r.sicoob_client_id);
      if (sicoob) return "sicoob";
      const inter = data.find((r: any) => r.provider === "banco_inter" && r.inter_client_id);
      if (inter) return "inter";
    }
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
        customer_id,
        customer,
        note_number,
        payment_method,
        total,
        appointment_date,
        days_ticket,
        boleto_id,
        boleto_url,
        boleto_digitable_line,
        boleto_barcode_number
      `)
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 400 });
    }

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    if (normalizePaymentMethod(order.payment_method) !== "boleto") {
      return NextResponse.json(
        { error: "Esta venda não está configurada para boleto." },
        { status: 422 },
      );
    }

    if (order.boleto_id || order.boleto_url) {
      return NextResponse.json(
        {
          success: true,
          alreadyExists: true,
          message: "Boleto já gerado para este pedido.",
          data: {
            boleto_id: order.boleto_id,
            boleto_url: order.boleto_url,
            boleto_digitable_line: order.boleto_digitable_line,
            boleto_barcode_number: order.boleto_barcode_number,
          },
        },
        { status: 200 },
      );
    }

    const appointmentYmd = parseDateToYmd(order.appointment_date);
    if (!appointmentYmd) {
      return NextResponse.json(
        { error: "appointment_date inválida no pedido" },
        { status: 422 },
      );
    }

    const daysTicket = Number(order.days_ticket ?? 0);
    const dueDate = plusDays(appointmentYmd, daysTicket > 0 ? daysTicket : 12);

    // ── Detectar provider ──────────────────────────────────────────────────────
    const provider = await detectBoletoProvider(supabase, companyId);

    // =========================================================================
    // SICOOB
    // =========================================================================
    if (provider === "sicoob") {
      const { data: customer, error: cliErr } = await supabase
        .from("customers")
        .select("id, company_id, name, document, email, phone, zip_code, address, number, neighborhood, city, state")
        .eq("id", order.customer_id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (cliErr) return NextResponse.json({ error: cliErr.message }, { status: 400 });
      if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
      if (!customer.document)
        return NextResponse.json({ error: "CPF/CNPJ do cliente não cadastrado. Atualize o cadastro do cliente." }, { status: 400 });

      const creds = await getSicoobCredsForCompany(supabase, companyId);
      const cpfCnpj = (customer.document as string).replace(/\D/g, "");
      const referencia = orderId.replace(/-/g, "").slice(0, 10);

      const sicoobPayload: SicoobBoleto = {
        numeroContrato: creds.numeroContrato,
        modalidade: 1,
        numeroContaCorrente: creds.numeroConta,
        especieDocumento: "DM",
        dataEmissao: appointmentYmd,
        seuNumero: referencia,
        valor: Number(order.total ?? 0),
        dataVencimento: dueDate,
        hibrido: true,
        pagador: {
          nomeRazaoSocial: customer.name,
          numeroCpfCnpj: cpfCnpj,
          codigoTipoInscricao: cpfCnpj.length === 14 ? 2 : 1,
          endereco: customer.address ?? undefined,
          bairro: customer.neighborhood ?? undefined,
          cidade: customer.city ?? undefined,
          uf: (customer.state as string | null)?.slice(0, 2).toUpperCase() ?? undefined,
          cep: customer.zip_code?.replace(/\D/g, "") ?? undefined,
          email: customer.email ?? undefined,
        },
        mensagem: {
          linha1: `Pedido ${order.note_number || orderId.slice(0, 8)} - ${order.customer || customer.name}`.slice(0, 77),
        },
      };

      const result = await createSicoobBoleto(creds, sicoobPayload);

      const update: Record<string, any> = {
        boleto_id: result.codigoSolicitacao,
        boleto_url: result.urlBoleto,
        boleto_digitable_line: result.linhaDigitavel,
        boleto_barcode_number: result.codigoBarras,
        due_date: dueDate,
        issue_date: appointmentYmd,
        payment_status: "Unpaid",
      };

      const { error: updErr } = await supabase
        .from("orders")
        .update(update)
        .eq("id", orderId)
        .eq("company_id", companyId);

      if (updErr) {
        console.error("❌ [Sicoob] Falha ao atualizar order:", updErr.message);
        return NextResponse.json({ success: false, error: "Boleto gerado, mas houve falha ao salvar no banco.", details: updErr.message }, { status: 500 });
      }

      if (result.linhaDigitavel) {
        sendBoletoEmailIfReady(orderId, companyId, supabase).catch((err) =>
          console.error("[mobile/emit-boleto/sicoob] Erro ao disparar email:", err),
        );
      }

      return NextResponse.json(
        {
          success: true,
          provider: "sicoob",
          message: "Boleto Sicoob gerado com sucesso.",
          data: {
            order_id: orderId,
            codigoSolicitacao: result.codigoSolicitacao,
            digitableLine: result.linhaDigitavel,
            barcode: result.codigoBarras,
            boletoUrl: result.urlBoleto,
            pixCopiaECola: result.pixCopiaECola,
          },
        },
        { status: 200 },
      );
    }

    // =========================================================================
    // INTER
    // =========================================================================
    if (provider === "inter") {
      const { data: customer, error: cliErr } = await supabase
        .from("customers")
        .select(
          "id, company_id, name, document, email, phone, zip_code, address, number, neighborhood, city, state",
        )
        .eq("id", order.customer_id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (cliErr) {
        return NextResponse.json({ error: cliErr.message }, { status: 400 });
      }

      if (!customer) {
        return NextResponse.json(
          { error: "Cliente não encontrado" },
          { status: 404 },
        );
      }

      if (!customer.document) {
        return NextResponse.json(
          {
            error:
              "CPF/CNPJ do cliente não cadastrado. Atualize o cadastro do cliente.",
          },
          { status: 400 },
        );
      }

      const creds = await getInterCredsForCompany(supabase, companyId);

      const cpfCnpj = (customer.document as string).replace(/\D/g, "");
      let rawPhone = customer.phone?.replace(/\D/g, "") || "";
      if (
        rawPhone.startsWith("55") &&
        (rawPhone.length === 12 || rawPhone.length === 13)
      ) {
        rawPhone = rawPhone.slice(2);
      }
      const ddd =
        rawPhone.length >= 10 ? rawPhone.slice(0, 2) : undefined;
      const telefone =
        rawPhone.length >= 10
          ? rawPhone.slice(2).slice(0, 9)
          : undefined;

      const referencia = orderId.replace(/-/g, "").slice(0, 15);

      const interPayload: InterCobranca = {
        seuNumero: referencia,
        valorNominal: Number(order.total ?? 0),
        dataVencimento: dueDate,
        pagador: {
          cpfCnpj,
          tipoPessoa: cpfCnpj.length === 14 ? "JURIDICA" : "FISICA",
          nome: customer.name,
          email: customer.email ?? undefined,
          ddd,
          telefone,
          cep: customer.zip_code?.replace(/\D/g, "") ?? undefined,
          endereco: customer.address ?? undefined,
          numero: customer.number ?? undefined,
          bairro: customer.neighborhood ?? undefined,
          cidade: customer.city ?? undefined,
          uf:
            (customer.state as string | null)
              ?.slice(0, 2)
              .toUpperCase() ?? undefined,
        },
        mensagem: {
          linha1: `Pedido ${order.note_number || orderId.slice(0, 8)} - ${order.customer || customer.name}`.slice(0, 77),
        },
        formasRecebimento: ["BOLETO", "PIX"],
      };

      const result = await createInterCobranca(creds, interPayload);

      const update: Record<string, any> = {
        boleto_id: result.codigoSolicitacao,
        boleto_url: result.linkVisualizacao,
        boleto_digitable_line: result.linhaDigitavel,
        boleto_barcode_number: result.codigoBarras,
        due_date: dueDate,
        issue_date: appointmentYmd,
        payment_status: "Unpaid",
      };

      const { error: updErr } = await supabase
        .from("orders")
        .update(update)
        .eq("id", orderId)
        .eq("company_id", companyId);

      if (updErr) {
        console.error("❌ [Inter] Falha ao atualizar order:", updErr.message);
        return NextResponse.json(
          {
            success: false,
            error: "Boleto gerado, mas houve falha ao salvar no banco.",
            details: updErr.message,
          },
          { status: 500 },
        );
      }

      if (result.linhaDigitavel) {
        sendBoletoEmailIfReady(orderId, companyId, supabase).catch((err) =>
          console.error("[mobile/emit-boleto/inter] Erro ao disparar email:", err),
        );
      }

      return NextResponse.json(
        {
          success: true,
          provider: "inter",
          message: "Boleto Inter gerado com sucesso.",
          data: {
            order_id: orderId,
            codigoSolicitacao: result.codigoSolicitacao,
            digitableLine: result.linhaDigitavel,
            barcode: result.codigoBarras,
            boletoUrl: result.linkVisualizacao,
            pixCopiaECola: result.pixCopiaECola,
          },
        },
        { status: 200 },
      );
    }

    // =========================================================================
    // ASAAS (default)
    // =========================================================================
    const { data: customer, error: cliErr } = await supabase
      .from("customers")
      .select(`
        id,
        company_id,
        name,
        asaas_customer_id
      `)
      .eq("id", order.customer_id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cliErr) {
      return NextResponse.json({ error: cliErr.message }, { status: 400 });
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (!customer.asaas_customer_id) {
      return NextResponse.json(
        { error: "Cliente não sincronizado com o Asaas" },
        { status: 400 },
      );
    }

    const payload: Record<string, any> = {
      customer: customer.asaas_customer_id,
      billingType: "BOLETO",
      value: Number(order.total ?? 0),
      dueDate,
      description: `Pedido ${order.note_number || order.id} - ${order.customer || customer.name}`,
      postalService: false,
    };

    const created = await asaasFetch<any>(
      supabase,
      companyId,
      "/payments",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const boletoUrl = created.bankSlipUrl ?? created.invoiceUrl ?? null;

    let digitableLine: string | null =
      created.identificationField ?? created.digitableLine ?? null;

    let barcode: string | null = created.bankSlipBarcode ?? null;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (digitableLine && barcode) break;

      try {
        await sleep(RETRY_DELAY_MS);

        const identification = await asaasFetch<any>(
          supabase,
          companyId,
          `/payments/${created.id}/identificationField`,
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
      } catch (err) {
        console.warn(
          `⚠️ [emit-boleto] tentativa ${attempt}/${MAX_RETRIES} - erro ao obter identificationField:`,
          err,
        );
      }
    }

    const update: Record<string, any> = {
      boleto_id: created.id,
      boleto_url: boletoUrl,
      boleto_digitable_line: digitableLine,
      boleto_barcode_number: barcode,
      boleto_expiration_date: dueDate,
      due_date: dueDate,
      issue_date: appointmentYmd,
      payment_status: "Unpaid",
    };

    const { error: updErr } = await supabase
      .from("orders")
      .update(update)
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (updErr) {
      console.error("❌ Falha ao atualizar order com dados do boleto:", updErr);
      return NextResponse.json(
        {
          success: false,
          error: "Boleto gerado, mas houve falha ao salvar no banco.",
          details: updErr.message,
        },
        { status: 500 },
      );
    }

    sendBoletoEmailIfReady(orderId, companyId, supabase).catch((err) =>
      console.error("[mobile/emit-boleto] Erro ao disparar email:", err),
    );

    return NextResponse.json(
      {
        success: true,
        provider: "asaas",
        message: "Boleto gerado com sucesso.",
        data: {
          order_id: orderId,
          asaasPaymentId: created.id,
          digitableLine,
          barcode,
          boletoUrl,
          expirationDate: dueDate,
          payment: created,
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("❌ mobile emit-boleto - erro:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao criar boleto" },
      { status: 400 },
    );
  }
}