import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, phone } = await req.json();

    if (!userId || !phone) {
      return NextResponse.json({ error: "Faltam parâmetros." }, { status: 400 });
    }

    // Supabase auth.users phone column requires E.164 format (ex: +5511999999999)
    let cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("+")) {
      // Assuming Brazilian numbers by default if no country code
      if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        cleanPhone = "+55" + cleanPhone;
      } else {
        cleanPhone = "+" + cleanPhone;
      }
    }

    // Salva o telefone na tabela public.profiles
    const { error } = await admin
      .from("profiles")
      .update({ phone: cleanPhone })
      .eq("id", userId);

    if (error) {
      console.error("[sync-phone] Erro ao atualizar telefone:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[sync-phone] Erro inesperado:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
