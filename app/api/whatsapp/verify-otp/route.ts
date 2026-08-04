export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHash } from "crypto";

import Stripe from "stripe";

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil" as any,
});

export async function POST(req: Request) {
  try {
    const { otp } = await req.json();

    if (!otp || typeof otp !== "string" || otp.length !== 6) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
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

    // Busca o profile com os dados do OTP
    const { data: profile } = await adminClient
      .from("profiles")
      .select("whatsapp_otp_hash, whatsapp_otp_expires_at, whatsapp_verified")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    if (profile.whatsapp_verified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    if (!profile.whatsapp_otp_hash || !profile.whatsapp_otp_expires_at) {
      return NextResponse.json(
        { error: "Nenhum código ativo. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Verifica se o OTP expirou
    const expiresAt = new Date(profile.whatsapp_otp_expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: "Código expirado. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Compara o hash SHA-256 do OTP fornecido com o hash armazenado
    const providedHash = createHash("sha256").update(otp.trim()).digest("hex");
    if (providedHash !== profile.whatsapp_otp_hash) {
      return NextResponse.json({ error: "Código incorreto. Tente novamente." }, { status: 400 });
    }

    // ✅ OTP válido — marca o WhatsApp como verificado e limpa os campos de OTP
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        whatsapp_verified: true,
        whatsapp_otp_hash: null,
        whatsapp_otp_expires_at: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[verify-otp] Erro ao marcar whatsapp_verified:", updateError);
      return NextResponse.json({ error: "Erro ao verificar. Tente novamente." }, { status: 500 });
    }

    console.log(`[verify-otp] WhatsApp verificado com sucesso para user ${user.id}`);

    // ✅ APÓS VERIFICAR, CRIAR O TRIAL AUTOMATICAMENTE NO PLANO ESSENTIAL
    try {
      const { data: profileData } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
        
      const companyId = profileData?.company_id;

      if (companyId) {
        // Verifica se a empresa já tem alguma assinatura
        const { data: existingSub } = await adminClient
          .from("subscriptions")
          .select("id")
          .eq("company_id", companyId)
          .limit(1)
          .maybeSingle();

        if (!existingSub) {
          // Busca a empresa para pegar/criar o customer no Stripe
          const { data: company } = await adminClient
            .from("companies")
            .select("stripe_customer_id, email, name")
            .eq("id", companyId)
            .single();

          if (company) {
            let stripeCustomerId = company.stripe_customer_id;

            if (!stripeCustomerId) {
              const customer = await stripe.customers.create({
                email: company.email ?? undefined,
                name: company.name ?? undefined,
                metadata: { companyId },
              });
              stripeCustomerId = customer.id;

              await adminClient
                .from("companies")
                .update({ stripe_customer_id: stripeCustomerId })
                .eq("id", companyId);
            }

            // Cria a assinatura com trial de 15 dias no plano Essential Mensal
            await stripe.subscriptions.create({
              customer: stripeCustomerId,
              items: [{ price: "price_1TKV9t4Ik5RguVVSjcoyxCkh", quantity: 1 }],
              trial_period_days: 15,
              payment_behavior: "default_incomplete",
              metadata: { companyId },
            });
            
            console.log(`[verify-otp] Trial automático de 15 dias criado para company ${companyId}`);
          }
        }
      }
    } catch (trialErr: any) {
      console.error("[verify-otp] Erro ao criar trial automático:", trialErr);
      // Não retorna erro para o frontend, pois o WhatsApp foi verificado com sucesso
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[verify-otp] Erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
