// app/api/nfe/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";

async function createSupabaseRouteClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // sem alterar comportamento
          }
        },
      },
    },
  );
}

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteClient();

  try {
    const { ref, companyId: bodyCompanyId } = await req.json();

    if (!ref) {
      return NextResponse.json(
        { error: "ref é obrigatório" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

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

    // --- Multi-tenant fix: Verify company membership ---
    let query = supabase.from("company_users").select("company_id").eq("user_id", user.id);
    
    if (bodyCompanyId) {
      query = query.eq("company_id", bodyCompanyId);
    }

    const { data: membership, error: compErr } = await query.maybeSingle();

    if (compErr || !membership?.company_id) {
      return NextResponse.json(
        { error: "Acesso negado ou empresa não encontrada" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const companyId = membership.company_id;

    const res = await fetchInvoiceStatus({ supabase, companyId, ref });

    if ("error" in res) {
      return NextResponse.json(
        { error: res.error, mensagem_sefaz: res.mensagem_sefaz ?? null },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data, mensagem_sefaz } = res;

    const payloadToUpdate: any = {};
    
    if (data?.status) payloadToUpdate.status = data.status;
    if (data?.numero) payloadToUpdate.numero = data.numero;
    if (data?.serie) payloadToUpdate.serie = data.serie;
    if (data?.chave) payloadToUpdate.chave_nfe = data.chave;
    if (data?.xml_url) payloadToUpdate.xml_url = data.xml_url;
    if (data?.danfe_url) payloadToUpdate.danfe_url = data.danfe_url;
    if (data?.data_emissao) payloadToUpdate.data_emissao = data.data_emissao;

    const { error: updateError } = await supabase
      .from("invoices")
      .update(payloadToUpdate)
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