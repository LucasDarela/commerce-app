export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  code: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-_.]+$/i),
  enabled: z.boolean().optional().default(true),
  default_days: z.number().int().min(0).default(0),
});

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const companyId = cu?.company_id;
  if (!companyId)
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("company_id", companyId)
    .order("enabled", { ascending: false })
    .order("name", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { methods: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const json = await req.json();
  const parsed = UpsertSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const companyId = cu?.company_id;
  if (!companyId)
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 400 },
    );

  const row = {
    ...parsed.data,
    company_id: companyId,
    updated_at: new Date().toISOString(),
  };

  if (row.id) {
    const { error } = await supabase
      .from("payment_methods")
      .update(row)
      .eq("id", row.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("payment_methods").insert(row);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await req.json();
  if (!id)
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
