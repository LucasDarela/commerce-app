// app/api/users/delete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supa = createRouteHandlerClient({ cookies });
  const {
    data: { user: requester },
    error: authErr,
  } = await supa.auth.getUser();

  if (authErr || !requester) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { user_id, company_id } = await req.json();

  if (!user_id || !company_id) {
    return NextResponse.json(
      { error: "Parâmetros inválidos." },
      { status: 400 },
    );
  }

  if (requester.id === user_id) {
    return NextResponse.json(
      { error: "Você não pode deletar a si mesmo." },
      { status: 400 },
    );
  }

  // Service Role para consultas que podem ser bloqueadas por RLS
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1) Verifica se o requester é ADMIN da empresa
  const { data: meRole, error: meRoleErr } = await admin
    .from("company_users")
    .select("role")
    .eq("user_id", requester.id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (meRoleErr || meRole?.role !== "admin") {
    return NextResponse.json(
      { error: "Apenas administradores podem deletar usuários." },
      { status: 403 },
    );
  }

  // 2) Verifica se o alvo pertence à empresa:
  //    primeiro em company_users; se não houver (convite pendente?), confere profiles.company_id
  const { data: linkRow, error: linkErr } = await admin
    .from("company_users")
    .select("id")
    .eq("user_id", user_id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (linkErr) {
    return NextResponse.json(
      { error: `Falha ao verificar vínculo: ${linkErr.message}` },
      { status: 400 },
    );
  }

  if (!linkRow) {
    // fallback: checa no profiles
    const { data: profileRow, error: profErr } = await admin
      .from("profiles")
      .select("company_id")
      .eq("id", user_id)
      .maybeSingle();

    if (profErr) {
      return NextResponse.json(
        { error: `Falha ao verificar perfil: ${profErr.message}` },
        { status: 400 },
      );
    }

    if (!profileRow || profileRow.company_id !== company_id) {
      return NextResponse.json(
        { error: "Usuário não pertence a esta empresa." },
        { status: 404 },
      );
    }
    // se caiu aqui, pertence via profiles, só não tem (ainda) linha em company_users
  }

  // 3) Remove vínculo em company_users (se existir)
  const { error: unlinkErr } = await admin
    .from("company_users")
    .delete()
    .match({ user_id, company_id });

  if (unlinkErr) {
    return NextResponse.json(
      {
        error: `Falha ao desvincular usuário da empresa: ${unlinkErr.message}`,
      },
      { status: 400 },
    );
  }

  // 4) Deleta o usuário no Auth (apaga globalmente do projeto)
  const { error: delAuthErr } = await admin.auth.admin.deleteUser(user_id);
  if (delAuthErr) {
    return NextResponse.json(
      { error: `Falha ao deletar usuário no Auth: ${delAuthErr.message}` },
      { status: 400 },
    );
  }

  // 5) (opcional) limpa o profile; se falhar, só loga e segue
  const { error: delProfileErr } = await admin
    .from("profiles")
    .delete()
    .eq("id", user_id);

  if (delProfileErr) {
    console.error(
      "[users/delete] Falha ao deletar profile:",
      delProfileErr.message,
    );
  }

  return NextResponse.json({ ok: true });
}
