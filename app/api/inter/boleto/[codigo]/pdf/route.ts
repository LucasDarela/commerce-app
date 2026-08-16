import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getInterCredsForCompany, interFetch } from "@/lib/inter";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;
    
    // 1. Usar service_role para permitir acesso público ao PDF (sem cookie)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Localizar o pedido pelo boleto_id (codigoSolicitacao)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("company_id")
      .eq("boleto_id", codigo)
      .maybeSingle();

    if (orderErr || !order?.company_id) {
      return NextResponse.json(
        { error: "Boleto não encontrado no sistema" },
        { status: 404 }
      );
    }
    const companyId = order.company_id;

    // 3. Obter as credenciais da conta Inter da empresa
    const creds = await getInterCredsForCompany(supabaseAdmin, companyId);

    // 4. Buscar o PDF no Banco Inter
    const json: any = await interFetch(creds, `/cobrancas/${codigo}/pdf`, {
      method: "GET",
    });

    if (!json || !json.pdf) {
      return NextResponse.json(
        { error: "PDF não retornado pelo Banco Inter" },
        { status: 404 }
      );
    }

    // 5. Decodificar Base64 e retornar como arquivo PDF
    const pdfBuffer = Buffer.from(json.pdf, "base64");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="boleto-${codigo}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("❌ [Inter] Erro ao buscar PDF do boleto:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao buscar PDF do boleto" },
      { status: 400 }
    );
  }
}
