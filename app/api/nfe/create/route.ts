// app/api/nfe/create/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { emitInvoice } from "@/lib/focus-nfe/emitInvoice";
import { invoiceSchema } from "@/lib/focus-nfe/invoiceSchema";

export async function POST(req: Request) {
  const supabase = createServerComponentClient({ cookies });

  try {
    const body = await req.json();
    const { companyId, invoiceData } = body;

    if (!companyId || !invoiceData) {
      return NextResponse.json(
        { error: "companyId e invoiceData são obrigatórios" },
        { status: 400 },
      );
    }

    // 🧪 Validação do schema
    const parseResult = invoiceSchema.safeParse(invoiceData);
    if (!parseResult.success) {
      console.error(
        "❌ Erro de validação da NF-e:",
        parseResult.error.flatten(),
      );
      return NextResponse.json(
        {
          error: "Dados da nota inválidos",
          details: parseResult.error.format(),
        },
        { status: 422 },
      );
    }

    // Busca o último número emitido para a empresa
    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("numero")
      .eq("company_id", companyId)
      .order("numero", { ascending: false })
      .limit(1);

    let nextNumero = 1;
    if (lastInvoice && lastInvoice.length > 0) {
      nextNumero = Number(lastInvoice[0].numero) + 1; // sempre incrementa
    }

    invoiceData.numero = nextNumero;
    invoiceData.serie = "1";

    console.log("🧾 Emitindo NF-e:", invoiceData);

    const result = await emitInvoice({
      companyId,
      invoiceData,
      supabaseClient: supabase,
    });

    // Salva no banco
    const { error: insertError } = await supabase.from("invoices").insert([
      {
        company_id: companyId,
        order_id: invoiceData.order_id,
        numero: nextNumero,
        serie: invoiceData.serie,
        chave_nfe: result.chave || null,
        status: result.status,
        ref: result.ref,
        valor_total: invoiceData.valor_total,
        xml_url: result.xml_url || null,
        danfe_url: result.danfe_url || null,
        data_emissao: invoiceData.data_emissao,
        natureza_operacao: invoiceData.natureza_operacao,
        customer_name: invoiceData.nome_destinatario,
      },
    ]);

    if (insertError) {
      console.error("❌ Erro ao salvar nota:", insertError);
      return NextResponse.json(
        { error: "NF-e emitida, mas não foi possível salvar no banco" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("❌ Erro ao emitir NF-e:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno", detalhes: err },
      { status: 500 },
    );
  }
}
