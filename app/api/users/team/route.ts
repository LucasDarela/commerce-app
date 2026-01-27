// app/api/users/team/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supa = createRouteHandlerClient({ cookies });

    const {
      data: { user: inviter },
      error: sessErr,
    } = await supa.auth.getUser();

    if (sessErr || !inviter) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      console.error("[team] Missing env", { hasUrl: !!url, hasServiceKey: !!serviceKey });
      return NextResponse.json({ error: "Missing server env" }, { status: 500 });
    }

    const admin = createClient(url, serviceKey);

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

    const { data: rows, error: listErr } = await admin
      .from("company_users")
      .select("user_id, role")
      .eq("company_id", cu.company_id);

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 400 });
    }

    const userIds = (rows ?? []).map((r) => r.user_id).filter(Boolean);

    const { data: profiles, error: профErr } = await admin
      .from("profiles")
      .select("id, email, is_blocked")
      .in("id", userIds);

    if (профErr) {
      return NextResponse.json({ error: профErr.message }, { status: 400 });
    }

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const members = await Promise.all(
      (rows ?? []).map(async (row: any) => {
        const { data: ures, error: uErr } = await admin.auth.admin.getUserById(row.user_id);
        if (uErr) console.warn("[team] getUserById error:", uErr.message);

        const u = ures?.user;
        const p: any = profileMap.get(row.user_id);

        return {
          id: row.user_id,
          email: p?.email ?? u?.email ?? "",
          role: row.role,
          isBlocked: !!p?.is_blocked,
          emailConfirmed: !!u?.confirmed_at,
          lastSignInAt: u?.last_sign_in_at ?? null,
          pending: !u?.confirmed_at,
        };
      }),
    );

    return NextResponse.json({ members }, { status: 200 });
  } catch (e: any) {
    console.error("[team] GET error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal error listing team" },
      { status: 500 },
    );
  }
}