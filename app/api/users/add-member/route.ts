// app/api/users/add-member/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalizeRole(role: string) {
  const value = role?.toLowerCase().trim();

  if (value === "driver") return "driver";
  if (value === "normal") return "normal";
  if (value === "admin") return "admin";

  return value;
}

export async function POST(req: Request) {
  try {
    const supa = createRouteHandlerClient({ cookies });

    const {
      data: { user: inviter },
    } = await supa.auth.getUser();

    if (!inviter) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();
    const role = normalizeRole(body?.role ?? "");

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email e role são obrigatórios." },
        { status: 400 },
      );
    }

    const { data: cu, error: cuErr } = await admin
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", inviter.id)
      .maybeSingle();

    if (cuErr || !cu?.company_id) {
      return NextResponse.json(
        { error: "Company not found for inviter" },
        { status: 400 },
      );
    }

    const validRoles = ["admin", "normal", "driver"];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role inválida." },
        { status: 400 },
      );
    }

    if (role === "admin" && cu.role !== "admin") {
      return NextResponse.json(
        { error: "Somente administradores podem convidar admins." },
        { status: 403 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL não configurada." },
        { status: 500 },
      );
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        company_id: cu.company_id,
        invited_role: role,
      },
      redirectTo: `${siteUrl}/auth/callback?type=invite&next=/set-password`,
    });

    if (error) {
      console.error("[add-member] invite error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, userId: data.user?.id },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("[add-member] error:", e?.message || e);
    return NextResponse.json(
      { error: "Erro interno no add-member." },
      { status: 500 },
    );
  }
}