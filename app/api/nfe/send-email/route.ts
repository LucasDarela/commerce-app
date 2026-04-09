// app/api/nfe/send-email/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendNfeEmailIfReady } from "@/lib/nfe/sendNfeEmail";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!companyUser?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 403 },
      );
    }

    const companyId = companyUser.company_id;
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "invoiceId é obrigatório" },
        { status: 400 },
      );
    }

    const result = await sendNfeEmailIfReady(invoiceId, companyId, supabase);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[/api/nfe/send-email] Erro:", err?.message ?? err);
    return NextResponse.json(
      { error: "Erro interno ao enviar email" },
      { status: 500 },
    );
  }
}