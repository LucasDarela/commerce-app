import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://chopphub.com";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[cron/abandoned-checkout] Iniciando varredura...");

    // Busca perfis com company_id (owners)
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
      // Busca o usuário real no auth para verificar metadados e data de criação
      const { data: userAuth } = await admin.auth.admin.getUserById(profile.id);
      if (!userAuth || !userAuth.user) continue;

      // Se é usuário convidado (tem invited_role), não é o dono — ignorar
      if (userAuth.user.user_metadata?.invited_role) continue;

      const createdAt = new Date(userAuth.user.created_at);
      const hoursSinceCreation = Math.abs(now.getTime() - createdAt.getTime()) / 36e5;

      // NOVA LÓGICA: "abandonou" = não tem subscription OU status não é active/trialing/past_due
      // Antes checar stripe_subscription_id IS NULL, mas com o novo trial sem cartão isso seria errado
      const { data: subscription } = await admin
        .from("subscriptions")
        .select("status, stripe_subscription_id")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      const isActive = subscription &&
        ["active", "trialing", "past_due"].includes(subscription.status);

      // Se a empresa já tem assinatura válida, não manda mais e-mails de abandono
      if (isActive) continue;

      // ---- STEP 1: 1 Hora depois (E-mail de boas-vindas + convite ao trial) ----
      if (
        hoursSinceCreation >= 1 &&
        hoursSinceCreation < 24 &&
        !profile.abandon_step_1_sent_at
      ) {
        console.log(`[Step 1] Enviando e-mail de ativação para ${profile.email}`);

        await resend.emails.send({
          from: "Chopp Hub <suporte@chopphub.com>",
          to: [profile.email],
          subject: "🎉 Sua conta está pronta — comece seu trial grátis agora!",
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
              <h2 style="color: #3b82f6;">Bem-vindo ao Chopp Hub${profile.name ? `, ${profile.name}` : ''}!</h2>
              <p>Sua conta foi criada com sucesso. Agora é hora de ativar seu <strong>trial gratuito de 15 dias</strong> e descobrir como o Chopp Hub pode transformar a gestão do seu negócio.</p>
              <p>Você pode começar a usar agora mesmo, <strong>sem precisar cadastrar cartão de crédito</strong>.</p>
              <p style="text-align: center; margin: 32px 0;">
                <a href="${SITE_URL}/dashboard/billing"
                   style="background: #3b82f6; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Ativar meu trial gratuito
                </a>
              </p>
              <p style="color: #6b7280; font-size: 14px;">Ficou com alguma dúvida? É só responder este e-mail.</p>
              <hr style="border-color: #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">Chopp Hub — Gestão inteligente para o seu negócio de chopp.</p>
            </div>
          `,
        });

        await admin.from("profiles").update({ abandon_step_1_sent_at: new Date().toISOString() }).eq("id", profile.id);
        results.push({ id: profile.id, step: 1 });
      }

      // ---- STEP 2: 24 Horas depois (E-mail com benefícios) ----
      if (
        hoursSinceCreation >= 24 &&
        hoursSinceCreation < 48 &&
        !profile.abandon_step_2_sent_at
      ) {
        console.log(`[Step 2] Enviando e-mail de benefícios para ${profile.email}`);

        await resend.emails.send({
          from: "Chopp Hub <suporte@chopphub.com>",
          to: [profile.email],
          subject: "📊 Veja o que você pode gerenciar com o Chopp Hub",
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
              <h2 style="color: #8b5cf6;">Você sabe o que o Chopp Hub pode fazer por você?</h2>
              <p>Olá${profile.name ? ` ${profile.name}` : ''},</p>
              <p>Você criou sua conta no Chopp Hub mas ainda não ativou seu trial. Deixa a gente te mostrar o que está esperando por você:</p>
              <ul style="line-height: 2;">
                <li>📦 <strong>Gestão de estoque</strong> em tempo real</li>
                <li>🚚 <strong>Controle de rotas</strong> e entregas de chopp</li>
                <li>📄 <strong>Emissão de NF-e</strong> integrada</li>
                <li>💰 <strong>Controle financeiro</strong> e boletos</li>
                <li>📱 <strong>App para motoristas</strong> (offline)</li>
              </ul>
              <p style="text-align: center; margin: 32px 0;">
                <a href="${SITE_URL}/dashboard/billing"
                   style="background: #8b5cf6; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Começar agora — 15 dias grátis
                </a>
              </p>
              <hr style="border-color: #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">Chopp Hub — Gestão inteligente para o seu negócio de chopp.</p>
            </div>
          `,
        });

        await admin.from("profiles").update({ abandon_step_2_sent_at: new Date().toISOString() }).eq("id", profile.id);
        results.push({ id: profile.id, step: 2 });
      }

      // ---- STEP 3: 48 Horas depois (E-mail de urgência) ----
      if (
        hoursSinceCreation >= 48 &&
        !profile.abandon_step_3_sent_at
      ) {
        console.log(`[Step 3] Enviando e-mail de urgência para ${profile.email}`);

        await resend.emails.send({
          from: "Chopp Hub <suporte@chopphub.com>",
          to: [profile.email],
          subject: "⚠️ Sua conta pode ser excluída em breve",
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
              <h2 style="color: #ef4444;">Não perca acesso à sua conta!</h2>
              <p>Olá,</p>
              <p>Notamos que você criou uma conta no Chopp Hub há alguns dias mas ainda não ativou seu período de trial.</p>
              <p>Contas inativas por muito tempo podem ser removidas do nosso sistema para liberar espaço.</p>
              <p>
                Mas ainda dá tempo: ative agora e ganhe <strong>15 dias grátis</strong> para testar tudo sem compromisso.
                <strong>Sem cartão de crédito necessário.</strong>
              </p>
              <p style="text-align: center; margin: 32px 0;">
                <a href="${SITE_URL}/dashboard/billing"
                   style="background: #ef4444; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Ativar minha conta agora
                </a>
              </p>
              <hr style="border-color: #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">Chopp Hub — Gestão inteligente para o seu negócio de chopp.</p>
            </div>
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
