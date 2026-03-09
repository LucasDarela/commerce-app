import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { invoiceSchema } from "@/lib/focus-nfe/invoiceSchema";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const body = await req.json();
    let { companyId, invoiceData } = body;

    if (!companyId) {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }

      const { data: row, error: compErr } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (compErr || !row?.company_id) {
        return NextResponse.json(
          { error: "company_id não encontrado para o usuário" },
          { status: 400 },
        );
      }

      companyId = row.company_id;
    }

    if (!companyId || !invoiceData) {
      return NextResponse.json(
        { error: "companyId e invoiceData são obrigatórios" },
        { status: 400 },
      );
    }

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