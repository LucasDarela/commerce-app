import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type SupabaseCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function normalizeRole(role: string) {
  const value = role?.toLowerCase().trim();

  if (value === "driver" || value === "motorista") return "driver";
  if (value === "normal" || value === "usuario") return "normal";
  if (value === "admin" || value === "administrador") return "admin";

  return value;
}

export async function POST(req: Request) {
  console.log("========== [ADD MEMBER START] ==========");

  try {
    const cookieStore = await cookies();

    const allCookies = cookieStore.getAll();
    console.log(
      "[add-member] cookies received:",
      allCookies.map((c) => c.name),
    );

    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: SupabaseCookie[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              console.log("[add-member] setAll ignored");
            }
          },
        },
      },
    );

    console.log("[add-member] fetching authenticated user");

    const {
      data: { user: inviter },
      error: inviterError,
    } = await supa.auth.getUser();

    console.log("[add-member] inviter:", inviter?.email ?? null);
    console.log("[add-member] inviterError:", inviterError ?? null);

    if (inviterError || !inviter) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: inviterError?.message ?? "No session user found",
        },
        { status: 401 },
      );
    }

    const body = await req.json();
    console.log("[add-member] raw body:", body);

    const email = body?.email?.trim()?.toLowerCase();
    const role = normalizeRole(body?.role ?? "");

    console.log("[add-member] normalized email:", email);
    console.log("[add-member] normalized role:", role);

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

    console.log("[add-member] company user:", cu);
    console.log("[add-member] company error:", cuErr);

    if (cuErr || !cu?.company_id) {
      return NextResponse.json(
        { error: "Company not found for inviter" },
        { status: 400 },
      );
    }

    const validRoles = ["admin", "normal", "driver"];

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Role inválida." }, { status: 400 });
    }

    if (role === "admin" && cu.role !== "admin") {
      return NextResponse.json(
        { error: "Somente administradores podem convidar admins." },
        { status: 403 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    console.log("[add-member] siteUrl:", siteUrl);

    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL não configurada." },
        { status: 500 },
      );
    }

    console.log("[add-member] calling inviteUserByEmail");

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        company_id: cu.company_id,
        invited_role: role,
      },
      redirectTo: `${siteUrl}/auth/callback?type=invite&next=/set-password`,
    });

    console.log("[add-member] invite response:", data);
    console.log("[add-member] invite error:", error);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("========== [ADD MEMBER SUCCESS] ==========");

    return NextResponse.json(
      { ok: true, userId: data.user?.id },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("[add-member] FATAL ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Erro interno no add-member." },
      { status: 500 },
    );
  }
}