export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHash, randomInt } from "crypto";

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Formata o telefone para o padrão Z-API (DDI + DDD + número, só dígitos)
// Ex: "(11) 9 9999-9999" → "5511999999999"
function formatPhoneForZAPI(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");

  // Se já tem DDI 55 e pelo menos 12 dígitos
  if (digits.startsWith("55") && digits.length >= 12) return digits;

  // Se tem 10 ou 11 dígitos (sem DDI), adiciona 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return null;
}

async function sendWhatsAppOTP(phone: string, otp: string): Promise<boolean> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    console.error("[send-otp] ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados");
    return false;
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const message =
    `🔐 *Chopp Hub* — Verificação de WhatsApp\n\n` +
    `Seu código de verificação é:\n\n` +
    `*${otp}*\n\n` +
    `Este código expira em 10 minutos.\n` +
    `Se você não solicitou isso, ignore esta mensagem.`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": token,
      },
      body: JSON.stringify({ phone, message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[send-otp] Z-API erro:", response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log("[send-otp] Z-API resposta:", data);
    return true;
  } catch (err) {
    console.error("[send-otp] Falha ao chamar Z-API:", err);
    return false;
  }
}

export async function POST(_req: Request) {
  try {
    // Verifica feature flag
    if (process.env.WHATSAPP_VERIFICATION_ENABLED !== "true") {
      return NextResponse.json({ error: "Verificação de WhatsApp não está ativada" }, { status: 503 });
    }

    // Autentica o usuário
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(_cs: { name: string; value: string; options?: Record<string, unknown> }[]) {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // Throttle: não permitir reenvio em menos de 60 segundos
    const { data: profile } = await adminClient
      .from("profiles")
      .select("phone, whatsapp_otp_expires_at, whatsapp_verified")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    if (profile.whatsapp_verified) {
      return NextResponse.json({ error: "WhatsApp já verificado" }, { status: 400 });
    }

    // Throttle: se o OTP atual ainda tem mais de 9 minutos de validade, é um reenvio muito rápido
    if (profile.whatsapp_otp_expires_at) {
      const expiresAt = new Date(profile.whatsapp_otp_expires_at);
      const nineMinutesFromNow = new Date(Date.now() + 9 * 60 * 1000);
      if (expiresAt > nineMinutesFromNow) {
        return NextResponse.json(
          { error: "Aguarde antes de solicitar um novo código", throttled: true },
          { status: 429 }
        );
      }
    }

    // Pega o telefone do profile ou do user_metadata
    const rawPhone = profile.phone || user.user_metadata?.phone || "";
    if (!rawPhone) {
      return NextResponse.json({ error: "Nenhum número de telefone encontrado no perfil" }, { status: 400 });
    }

    const phone = formatPhoneForZAPI(rawPhone);
    if (!phone) {
      return NextResponse.json({ error: "Número de telefone inválido. Acesse o perfil e atualize." }, { status: 400 });
    }

    // Gera OTP de 6 dígitos
    const otp = randomInt(100000, 999999).toString();

    // Armazena o hash SHA-256 do OTP (nunca o OTP em texto claro)
    const otpHash = createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        whatsapp_otp_hash: otpHash,
        whatsapp_otp_expires_at: expiresAt,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[send-otp] Erro ao salvar OTP:", updateError);
      return NextResponse.json({ error: "Erro interno ao gerar código" }, { status: 500 });
    }

    // Envia o OTP via Z-API
    const sent = await sendWhatsAppOTP(phone, otp);
    if (!sent) {
      return NextResponse.json(
        { error: "Não foi possível enviar o código. Verifique se o número está correto e tente novamente." },
        { status: 502 }
      );
    }

    // Retorna os últimos 4 dígitos para mostrar na UI (sem expor o número completo)
    const maskedPhone = `(${phone.slice(2, 4)}) ${"*".repeat(phone.length - 6)}${phone.slice(-4)}`;

    console.log(`[send-otp] OTP enviado para ${maskedPhone} (user ${user.id})`);
    return NextResponse.json({ ok: true, maskedPhone, expiresAt });
  } catch (err: any) {
    console.error("[send-otp] Erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
