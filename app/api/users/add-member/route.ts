// app/api/users/add-member/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await req.json();
  const { email, password, company_id } = body;

  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (signUpError || !signUpData.user) {
    return NextResponse.json({ error: signUpError?.message }, { status: 400 });
  }

  // 🔗 Vínculo com company
  const { error: insertError } = await supabase
    .from("company_users")
    .insert({
      user_id: signUpData.user.id,
      company_id,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}