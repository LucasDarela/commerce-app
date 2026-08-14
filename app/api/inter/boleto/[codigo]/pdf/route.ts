import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getInterCredsForCompany, interFetch } from "@/lib/inter";

export async function GET(
  req: Request,
  { params }: { params: { codigo: string } }
) {
  try {
    const { codigo } = params;
    const supabase = await createServerSupabaseClient();

    // 1. Validar a sessão do usuário logado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Pegar a empresa atual
    const { data: comp, error: compErr } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();

    if (compErr || !comp?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado" },
        { status: 403 }
      );
    }
    const companyId = comp.company_id;

    // 3. Obter as credenciais da conta Inter da empresa
    const creds = await getInterCredsForCompany(supabase, companyId);

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
