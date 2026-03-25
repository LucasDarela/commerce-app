// app/api/users/team/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: inviter },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[team] inviter:", inviter?.email ?? null);
    console.log("[team] authError:", authError ?? null);

    if (authError || !inviter) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: cu, error: cuErr } = await admin
      .from("company_users")
      .select("company_id")
      .eq("user_id", inviter.id)
      .maybeSingle();

    if (cuErr) {
      console.error("[team] company_users error:", cuErr);
      return NextResponse.json({ error: cuErr.message }, { status: 400 });
    }

    if (!cu?.company_id) {
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
      console.error("[team] list members error:", listErr);
      return NextResponse.json({ error: listErr.message }, { status: 400 });
    }

    const userIds = (rows ?? []).map((r) => r.user_id).filter(Boolean);

    if (!userIds.length) {
      return NextResponse.json({ members: [] }, { status: 200 });
    }

    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id, email, is_blocked, username")
      .in("id", userIds);

    if (profilesErr) {
      console.error("[team] profiles error:", profilesErr);
      return NextResponse.json({ error: profilesErr.message }, { status: 400 });
    }

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const members = await Promise.all(
      (rows ?? []).map(async (row: { user_id: string; role: string | null }) => {
        const { data: ures, error: uErr } = await admin.auth.admin.getUserById(
          row.user_id,
        );

        if (uErr) {
          console.warn("[team] getUserById error:", uErr.message);
        }

        const u = ures?.user;
        const p = profileMap.get(row.user_id) as
          | {
              id: string;
              email: string | null;
              is_blocked: boolean | null;
              username?: string | null;
            }
          | undefined;

        return {
          id: row.user_id,
          email: p?.email ?? u?.email ?? "",
          username: p?.username ?? "",
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