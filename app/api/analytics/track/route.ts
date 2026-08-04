export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { event_type, event_name, metadata } = await req.json();

    if (!event_type || !event_name) {
      return NextResponse.json({ error: "event_type e event_name são obrigatórios" }, { status: 400 });
    }

    // Autentica o usuário a partir da sessão
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(_cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            // read-only em server actions, mas ok para autenticação
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Busca o company_id do profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ ok: true, skipped: "sem company_id" });
    }

    // Insere o evento
    const { error } = await adminClient.from("user_events").insert({
      user_id: user.id,
      company_id: profile.company_id,
      event_type: event_type,
      event_name: event_name,
      metadata: metadata || {},
    });

    if (error) {
      console.error("[analytics/track] Erro ao inserir evento:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[analytics/track] Erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
