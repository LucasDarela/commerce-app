// app/api/nfe/create/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { emitInvoice } from "@/lib/focus-nfe/emitInvoice";
import { invoiceSchema } from "@/lib/focus-nfe/invoiceSchema";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { invoiceData } = body;

    if (!invoiceData) {
      return NextResponse.json(
        { error: "invoiceData é obrigatório" },
        { status: 400 },
      );
    }

    const { data: companyRow, error: compErr } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (compErr || !companyRow?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado para o usuário" },
        { status: 403 },
      );
    }

    const companyId = companyRow.company_id;

    const parse = invoiceSchema.safeParse(invoiceData);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Dados da nota inválidos", details: parse.error.format() },
        { status: 422 },
      );
    }

    const toIso = (s?: string | null) => {
      if (!s) return new Date().toISOString();
      const d = new Date(s);
      return Number.isNaN(d.getTime())
        ? new Date().toISOString()
        : d.toISOString();
    };

    const dataEmissaoDb = toIso(invoiceData.data_emissao);

    const ATIVOS = [
      "processando_autorizacao",
      "autorizado",
      "autorizada",
      "cancelado",
      "cancelada",
    ];

    const { data: ativa } = await supabase
      .from("invoices")
      .select("id, status, ref, numero, serie")
      .eq("company_id", companyId)
      .eq("order_id", invoiceData.order_id)
      .in("status", ATIVOS)
      .limit(1);

    if (ativa && ativa.length) {
      return NextResponse.json(
        { error: "Já existe NF-e ativa para este pedido.", ref: ativa[0].ref },
        { status: 409 },
      );
    }

    const { data: previous } = await supabase
      .from("invoices")
      .select("id, numero, serie, ref, status, created_at")
      .eq("company_id", companyId)
      .eq("order_id", invoiceData.order_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const prev = previous?.[0];
    const isRetry =
      prev?.status === "nota_rejeitada" || prev?.status === "erro_autorizacao";

    invoiceData.serie = invoiceData.serie || prev?.serie || "1";

    if (!invoiceData.note_number && invoiceData.order_id) {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("note_number")
        .eq("id", invoiceData.order_id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (orderRow?.note_number) {
        invoiceData.note_number = orderRow.note_number;
      }
    }

    if (!invoiceData.note_number) {
      return NextResponse.json(
        { error: "note_number é obrigatório para emissão idempotente" },
        { status: 400 },
      );
    }

    const { data: dup } = await supabase
      .from("invoices")
      .select("id, status, ref, numero")
      .eq("company_id", companyId)
      .eq("serie", invoiceData.serie)
      .eq("note_number", invoiceData.note_number)
      .in("status", ATIVOS)
      .maybeSingle();

    if (dup) {
      return NextResponse.json(
        { error: "NF-e já emitida para este número/série.", ref: dup.ref },
        { status: 409 },
      );
    }

    const baseRef = `${invoiceData.note_number}`;

    invoiceData.ref =
      isRetry && prev?.ref ? prev.ref : `${baseRef}_s${invoiceData.serie}`;

    console.log("[NFe create] ref gerada:", invoiceData.ref, {
      isRetry,
      order_id: invoiceData.order_id,
      note_number: invoiceData.note_number,
      companyId,
      userId: user.id,
    });

    if (isRetry && prev?.numero && Number(prev.numero) > 0) {
      invoiceData.numero = Number(prev.numero);
    } else if ("numero" in invoiceData) {
      delete invoiceData.numero;
    }

    const numeroParaBanco =
      isRetry && prev?.numero && Number(prev.numero) > 0
        ? Number(prev.numero)
        : null;

    const result = await emitInvoice({
      companyId,
      invoiceData,
      supabaseClient: supabase,
    });

    const numeroDefinitivo = (result as any)?.raw?.numero ?? numeroParaBanco;

    if (isRetry && prev?.id) {
      const { error: updateErr } = await supabase
        .from("invoices")
        .update({
          numero: numeroDefinitivo,
          serie: invoiceData.serie,
          status: result.status,
          chave_nfe: result.chave || null,
          xml_url: result.xml_url || null,
          danfe_url: result.danfe_url || null,
          data_emissao: dataEmissaoDb,
          natureza_operacao: invoiceData.natureza_operacao,
          customer_name: invoiceData.nome_destinatario,
          ref: invoiceData.ref,
        })
        .eq("id", prev.id)
        .eq("company_id", companyId);

      if (updateErr) {
        console.error("❌ Erro ao atualizar nota rejeitada:", updateErr);
        return NextResponse.json(
          { error: "Emitida, mas falhou ao atualizar." },
          { status: 500 },
        );
      }
    } else {
      const { error: insertErr } = await supabase.from("invoices").insert([
        {
          company_id: companyId,
          order_id: invoiceData.order_id,
          note_number: invoiceData.note_number,
          numero: numeroDefinitivo,
          serie: invoiceData.serie,
          chave_nfe: result.chave || null,
          status: result.status,
          ref: invoiceData.ref,
          valor_total: invoiceData.valor_total,
          xml_url: result.xml_url || null,
          danfe_url: result.danfe_url || null,
          data_emissao: dataEmissaoDb,
          natureza_operacao: invoiceData.natureza_operacao,
          customer_name: invoiceData.nome_destinatario,
        },
      ]);

      if (insertErr) {
        console.error("⚠️ Erro ao inserir invoice:", insertErr);
        return NextResponse.json(
          {
            success: false,
            error: "NF-e emitida na Focus, mas houve erro ao salvar no banco.",
            details: insertErr.message,
          },
          { status: 500 },
        );
      }
    }

    const isAuth = (result.status || "").toLowerCase().includes("autorizad");

    if (isAuth && (!result.xml_url || !result.danfe_url)) {
      const res = await fetchInvoiceStatus({
        supabase,
        companyId,
        ref: result.ref,
        poll: 2,
        intervalMs: 1500,
      });

      if (!("error" in res) && res.data) {
        await supabase
          .from("invoices")
          .update({
            numero: res.data.numero ?? numeroDefinitivo,
            serie: res.data.serie ?? invoiceData.serie,
            chave_nfe: res.data.chave ?? result.chave ?? null,
            xml_url: res.data.xml_url ?? result.xml_url ?? null,
            danfe_url: res.data.danfe_url ?? result.danfe_url ?? null,
            data_emissao: res.data?.data_emissao
              ? toIso(res.data.data_emissao)
              : dataEmissaoDb,
            status: res.data.status ?? result.status,
          })
          .eq("ref", result.ref)
          .eq("company_id", companyId);

        result.xml_url = res.data.xml_url ?? result.xml_url;
        result.danfe_url = res.data.danfe_url ?? result.danfe_url;
      }
    }

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Erro ao emitir NF-e:", err);

    const detalhes: Array<{ campo?: string; codigo?: any; mensagem?: string }> =
      Array.isArray(err?.erros)
        ? err.erros
        : Array.isArray(err?.focus?.erros)
          ? err.focus.erros
          : [];

    const readable = detalhes.map((d, i) => {
      const loc = d?.campo ? `(${d.campo})` : "";
      const cod = d?.codigo ? `[${d.codigo}]` : "";
      return `${i + 1}. ${cod} ${d?.mensagem ?? "Erro"} ${loc}`.trim();
    });

    return NextResponse.json(
      {
        error: err?.message || "Erro interno",
        status: err?.status || 500,
        detalhes,
        detalhes_texto: readable.join("\n"),
        focus: err?.focus || null,
      },
      { status: 500 },
    );
  }
}