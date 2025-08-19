// app/api/users/team/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Sessão do admin que está chamando
    const supa = createRouteHandlerClient({ cookies });
    const {
      data: { user: inviter },
      error: sessErr,
    } = await supa.auth.getUser();
    if (sessErr || !inviter) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Client com SRK para consultas privilegiadas
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Descobre a company do admin
    const { data: cu, error: cuErr } = await admin
      .from("company_users")
      .select("company_id")
      .eq("user_id", inviter.id)
      .maybeSingle();
    if (cuErr || !cu?.company_id) {
      return NextResponse.json(
        { error: "Company not found for inviter" },
        { status: 400 },
      );
    }

    // Junta APENAS com profiles (join entre tabelas públicas)
    const { data: rows, error: listErr } = await admin
      .from("company_users")
      .select(
        `
        user_id,
        role,
        profiles:profiles!inner(id,email,is_blocked)
      `,
      )
      .eq("company_id", cu.company_id);
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 400 });
    }

    // Busca dados do auth para cada user_id (confirmed_at, last_sign_in_at)
    const members = await Promise.all(
      (rows ?? []).map(async (row: any) => {
        const { data: ures } = await admin.auth.admin.getUserById(row.user_id);
        const u = ures?.user;
        return {
          id: row.user_id,
          email: row?.profiles?.email ?? u?.email ?? "",
          role: row.role,
          isBlocked: !!row?.profiles?.is_blocked,
          emailConfirmed: !!u?.confirmed_at,
          lastSignInAt: u?.last_sign_in_at ?? null,
          pending: !u?.confirmed_at,
        };
      }),
    );

    return NextResponse.json({ members }, { status: 200 });
  } catch (e: any) {
    console.error("[team] GET error:", e?.message || e);
    return NextResponse.json(
      { error: "Internal error listing team" },
      { status: 500 },
    );
  }
}
