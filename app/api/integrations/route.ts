import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/components/types/supabase";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, access_token } = body;

  if (!provider || !access_token) {
    return NextResponse.json(
      { error: "Campos obrigatórios ausentes" },
      { status: 400 },
    );
  }

  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!companyUser || "code" in companyUser) {
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  }

  await supabase
    .from("company_integrations")
    .delete()
    .eq("company_id", companyUser.company_id)
    .eq("provider", provider);

  const { error: insertError } = await supabase
    .from("company_integrations")
    .insert([
      {
        company_id: companyUser.company_id,
        provider,
        access_token,
      },
    ]);

  if (insertError) {
    console.error("Erro ao salvar integração:", insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const provider = req.nextUrl.searchParams.get("provider");

  if (!provider) {
    return NextResponse.json(
      { error: "Provider não informado" },
      { status: 400 },
    );
  }

  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!companyUser || "code" in companyUser) {
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabase
    .from("company_integrations")
    .delete()
    .eq("company_id", companyUser.company_id)
    .eq("provider", provider);

  if (deleteError) {
    console.error("Erro ao deletar integração:", deleteError.message);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
