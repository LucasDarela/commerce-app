// app/api/nfe/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { ref, companyId: companyIdFromBody } = await req.json();
    if (!ref) {
      return NextResponse.json(
        { error: "ref é obrigatório" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    let companyId: string | undefined = companyIdFromBody;
    if (!companyId) {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        return NextResponse.json(
          { error: "Não autenticado" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
      }
      const { data: cu } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      companyId = cu?.company_id ?? undefined;
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId não encontrado" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const res = await fetchInvoiceStatus({ supabase, companyId, ref });

    if ("error" in res) {
      return NextResponse.json(
        { error: res.error, mensagem_sefaz: res.mensagem_sefaz ?? null },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data, mensagem_sefaz } = res;

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: data?.status ?? null,
        numero: data?.numero ?? null,
        serie: data?.serie ?? null,
        chave_nfe: data?.chave ?? null,
        xml_url: data?.xml_url ?? null,
        danfe_url: data?.danfe_url ?? null,
        data_emissao: data?.data_emissao ?? null,
      })
      .eq("ref", ref)
      .eq("company_id", companyId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { success: true, data, mensagem_sefaz: mensagem_sefaz ?? null },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erro interno" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
