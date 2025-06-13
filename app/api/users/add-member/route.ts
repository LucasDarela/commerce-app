// app/api/users/add-member/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, company_id } = body;

  // 1️⃣ Cria o usuário no Auth
  const { data: signUpData, error: signUpError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

  if (signUpError || !signUpData.user) {
    console.error("Erro ao criar usuário:", signUpError?.message);
    return NextResponse.json({ error: signUpError?.message }, { status: 400 });
  }

  const user_id = signUpData.user.id;

  // 2️⃣ Aguarda o profile ser criado pela trigger on_auth_user_created
  let profileCreated = false;
  let attempts = 0;

  while (!profileCreated && attempts < 10) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (profileData?.id) {
      profileCreated = true;
    } else {
      await new Promise((res) => setTimeout(res, 500)); // espera 500ms
      attempts++;
    }
  }

  if (!profileCreated) {
    return NextResponse.json(
      { error: "Perfil não foi criado automaticamente." },
      { status: 400 },
    );
  }

  // 3️⃣ Atualiza o profile com company_id
  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({ company_id })
    .eq("id", user_id);

  if (updateProfileError) {
    console.error("Erro ao atualizar profile:", updateProfileError.message);
    return NextResponse.json(
      { error: updateProfileError.message },
      { status: 400 },
    );
  }

  // 4️⃣ Insere na company_users
  const { error: insertError } = await supabase.from("company_users").insert({
    user_id,
    company_id,
  });

  if (insertError) {
    console.error("Erro ao vincular company_users:", insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
