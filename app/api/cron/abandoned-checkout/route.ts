import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Crie uma API key no Resend
const resend = new Resend(process.env.RESEND_API_KEY!);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    // Para segurança, se quiser rodar por Vercel Cron, pode verificar um header de autorização
    const authHeader = req.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[cron/abandoned-checkout] Iniciando varredura...");

    // 1. Busca perfis criados nas últimas 48 horas para processarmos
    // Assumindo que você criou a coluna created_at e as colunas de tracking em profiles
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select(`
        id, 
        email, 
        name, 
        phone, 
        company_id, 
        created_at, 
        abandon_step_1_sent_at,
        abandon_step_2_sent_at,
        abandon_step_3_sent_at
      `)
      .not("company_id", "is", null);

    if (profilesError) throw profilesError;

    const now = new Date();
    const results = [];

    for (const profile of profiles || []) {
      // Busca a data real de criação no auth.users
      const { data: userAuth } = await admin.auth.admin.getUserById(profile.id);
      if (!userAuth || !userAuth.user) continue;

      const createdAt = new Date(userAuth.user.created_at);
      const hoursSinceCreation = Math.abs(now.getTime() - createdAt.getTime()) / 36e5;

      // 2. Verifica se a empresa finalizou o checkout (tem stripe_subscription_id)
      const { data: subscription } = await admin
        .from("subscriptions")
        .select("status, stripe_subscription_id")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      const hasCheckoutCompleted = subscription && subscription.stripe_subscription_id != null;

      // Se tem um ID de assinatura real do Stripe, garantimos que não mandaremos mais mensagens
      if (hasCheckoutCompleted) continue;

      // ---- STEP 1: 1 Hora depois (Email de Suporte) ----
      if (
        hoursSinceCreation >= 1 && 
        hoursSinceCreation < 24 &&
        !profile.abandon_step_1_sent_at
      ) {
        console.log(`[Step 1] Enviando email para ${profile.email}`);
        
        // Disparo de Email
        await resend.emails.send({
          from: "Chopp Hub <suporte@chopphub.com>",
          to: [profile.email],
          subject: "Houve algum problema com o seu cartão?",
          html: `
            <p>Olá${profile.name ? ` ${profile.name}` : ''},</p>
            <p>Vimos que você criou sua conta no Chopp Hub mas não finalizou a configuração do seu plano.</p>
            <p>Houve algum problema com o seu cartão ou ficou com alguma dúvida sobre a plataforma?</p>
            <p>Se precisar de ajuda, é só responder este e-mail. Se quiser finalizar agora, <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/account">clique aqui para acessar seu painel</a>.</p>
          `,
        });

        // Marca como enviado
        await admin.from("profiles").update({ abandon_step_1_sent_at: new Date().toISOString() }).eq("id", profile.id);
        results.push({ id: profile.id, step: 1 });
      }

      // ---- STEP 2: 24 Horas depois (WhatsApp) ----
      if (
        hoursSinceCreation >= 24 && 
        hoursSinceCreation < 48 &&
        !profile.abandon_step_2_sent_at
      ) {
        console.log(`[Step 2] Enviando WhatsApp para ${profile.phone}`);
        
        // Aqui você faria o POST para sua API do WhatsApp (Evolution, Z-API, etc)
        // if (profile.phone) { await fetch("SUA_API_WHATSAPP", {...}) }

        await admin.from("profiles").update({ abandon_step_2_sent_at: new Date().toISOString() }).eq("id", profile.id);
        results.push({ id: profile.id, step: 2 });
      }

      // ---- STEP 3: 48 Horas depois (Email Escassez) ----
      if (
        hoursSinceCreation >= 48 && 
        !profile.abandon_step_3_sent_at
      ) {
        console.log(`[Step 3] Enviando email de escassez para ${profile.email}`);
        
        // Disparo de Email
        await resend.emails.send({
          from: "Chopp Hub <suporte@chopphub.com>",
          to: [profile.email],
          subject: "Sua conta temporária vai expirar em breve",
          html: `
            <p>Olá,</p>
            <p>Notamos que você ainda não finalizou o seu cadastro no Chopp Hub.</p>
            <p>Para liberar espaço em nosso sistema, contas incompletas são deletadas após alguns dias.</p>
            <p>Mas temos uma condição especial para você: finalize agora e ganhe os primeiros 15 dias grátis para testar a plataforma na prática.</p>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/account">Ativar minha conta agora</a></p>
          `,
        });

        await admin.from("profiles").update({ abandon_step_3_sent_at: new Date().toISOString() }).eq("id", profile.id);
        results.push({ id: profile.id, step: 3 });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, details: results });
  } catch (e: any) {
    console.error("[cron/abandoned-checkout] Erro:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
