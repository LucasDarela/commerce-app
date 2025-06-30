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

    const parseResult = invoiceSchema.safeParse(invoiceData);
    console.log("invoiceData:", JSON.stringify(invoiceData, null, 2));
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

    console.log("🧾 Emitindo NF-e com os dados:", parseResult.data);

    const result = await emitInvoice({
      companyId,
      invoiceData: parseResult.data,
      supabaseClient: supabase,
    });

    // Extrai os dados necessários para armazenar
    const { ref, status } = result;
    const orderId = invoiceData.order_id; // Certifique-se que está incluso no payload
    const customerName = invoiceData.nome_destinatario;
    const total = invoiceData.valor_total;
    const naturezaOperacao = invoiceData.natureza_operacao;
    const emissao = invoiceData.data_emissao;

    // Insere na tabela invoices
    const { error: insertError } = await supabase.from("invoices").insert([
      {
        company_id: companyId,
        order_id: orderId,
        numero: result.numero,
        serie: result.serie,
        chave_nfe: result.chave,
        status: result.status,
        ref: result.ref,
        valor_total: invoiceData.valor_total,
        xml_url: result.xml_url,
        danfe_url: result.danfe_url,
        data_emissao: result.data_emissao,
        natureza_operacao: invoiceData.natureza_operacao,
        customer_name: customerName,
      },
    ]);

    if (insertError) {
      console.error("❌ Erro ao salvar nota em invoices:", insertError);
      return NextResponse.json(
        { error: "NF-e emitida, mas não foi possível salvar no banco" },
        { status: 500 },
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro na emissão da nota:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno" },
      { status: 500 },
    );
  }
}
