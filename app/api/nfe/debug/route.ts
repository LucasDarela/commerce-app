import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invoiceSchema } from "@/lib/focus-nfe/invoiceSchema";

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

    const { data: row, error: compErr } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (compErr || !row?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado para o usuário" },
        { status: 403 },
      );
    }

    const companyId = row.company_id;

    const parsed = invoiceSchema.safeParse(invoiceData);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados da nota inválidos",
          details: parsed.error.format(),
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payload validado com sucesso",
        companyId,
        invoiceData: parsed.data,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[DEBUG NF-E ROUTE ERROR]", err);

    return NextResponse.json(
      {
        error: err?.message || "Erro interno no debug da NF-e",
      },
      { status: 500 },
    );
  }
}