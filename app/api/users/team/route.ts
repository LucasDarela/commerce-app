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

    if (cuErr || !cu?.company_id) {
      return NextResponse.json({ error: "Company not found for inviter" }, { status: 400 });
    }

    const [compRes, subRes] = await Promise.all([
      admin.from("companies").select("extra_seats").eq("id", cu.company_id).maybeSingle(),
      admin.from("subscriptions").select("price_id, status").eq("company_id", cu.company_id).maybeSingle()
    ]);

    if (compRes.error) return NextResponse.json({ error: compRes.error.message }, { status: 400 });

    // --- CÁLCULO DE LIMITES ---
    const BASE_LIMITS: Record<string, number> = {
      "price_1TKV9t4Ik5RguVVSjcoyxCkh": 2, // Essential Mensal
      "price_1TKVB04Ik5RguVVSiYno016o": 2, // Essential Anual
      "price_1TKVBe4Ik5RguVVS5gwSObQ7": 5, // Pro Mensal
      "price_1TKVCF4Ik5RguVVS0JGxcik2": 5, // Pro Anual
      "price_1TKVER4Ik5RguVVS71L2NInl": 15, // Enterprise Mensal
      "price_1TKVFK4Ik5RguVVSL0e4G83O": 15, // Enterprise Anual
    };

    const company = compRes.data as any;
    const activeSub = subRes.data as any;

    const baseLimit = BASE_LIMITS[activeSub?.price_id || ""] || 2;
    const extraSeats = company?.extra_seats || 0;
    const totalLimit = baseLimit + extraSeats;
    // --- FIM CÁLCULO ---

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
      return NextResponse.json({ 
        members: [], 
        capacity: { used: 0, total: totalLimit, base: baseLimit, extra: extraSeats } 
      }, { status: 200 });
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
        const p = profileMap.get(row.user_id) as any;

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

    return NextResponse.json({ 
      members, 
      capacity: { used: members.length, total: totalLimit, base: baseLimit, extra: extraSeats } 
    }, { status: 200 });
  } catch (e: any) {
    console.error("[team] GET error:", e);

    return NextResponse.json(
      { error: e?.message || "Internal error listing team" },
      { status: 500 },
    );
  }
}