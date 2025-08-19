// app/api/users/resend-invite/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supa = createRouteHandlerClient({ cookies });
  const {
    data: { user: inviter },
  } = await supa.auth.getUser();
  if (!inviter)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { email } = await req.json();

  // company do admin (para embutir no meta)
  const { data: cu } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", inviter.id)
    .maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite", // funciona para usuário existente não confirmado
    email,
    options: {
      data: { company_id: cu?.company_id },
      redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
    },
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  // IMPORTANTE: generateLink NÃO envia e-mail. Você pode:
  // - Enviar esse link com seu provedor de email, OU
  // - Mostrar na UI e copiar para área de transferência.
  return NextResponse.json({ actionLink: data.properties?.action_link });
}
