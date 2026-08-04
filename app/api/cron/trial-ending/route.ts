export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// E-mails a enviar: 5 dias, 3 dias, 1 dia antes
const REMINDERS = [
  { days: 5, field: "trial_reminder_5d_sent_at", label: "5 dias" },
  { days: 3, field: "trial_reminder_3d_sent_at", label: "3 dias" },
  { days: 1, field: "trial_reminder_1d_sent_at", label: "1 dia" },
] as const;

function buildEmailHtml(companyName: string | null, daysLeft: number, trialEndFormatted: string, siteUrl: string) {
  const urgency = daysLeft === 1
    ? { color: "#ef4444", emoji: "🚨", heading: "Último dia do seu trial!" }
    : daysLeft <= 3
    ? { color: "#f59e0b", emoji: "⏳", heading: `Seu trial termina em ${daysLeft} dias!` }
    : { color: "#3b82f6", emoji: "📅", heading: `Seu trial termina em ${daysLeft} dias` };

  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="color: ${urgency.color};">${urgency.emoji} ${urgency.heading}</h2>
      <p>Olá${companyName ? ` da <strong>${companyName}</strong>` : ''},</p>
      <p>
        Seu período de teste gratuito no <strong>Chopp Hub</strong> termina 
        em <strong>${trialEndFormatted}</strong> — faltam apenas <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>.
      </p>
      <p>
        Para continuar usando a plataforma sem interrupções, adicione uma forma de pagamento 
        antes dessa data. Você só será cobrado após o término do trial.
      </p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${siteUrl}/dashboard/billing"
           style="background: ${urgency.color}; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Adicionar forma de pagamento
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Se precisar de ajuda ou tiver dúvidas, é só responder este e-mail.
      </p>
      <hr style="border-color: #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        Chopp Hub — Gestão inteligente para o seu negócio de chopp.
      </p>
    </div>
  `;
}

export async function GET(req: Request) {
  try {
    // Proteção: verificar CRON_SECRET se configurado
    const authHeader = req.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[cron/trial-ending] Iniciando varredura de trials...");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://chopphub.com";
    const now = new Date();
    const results: { companyId: string; email: string; daysLeft: number; sent: boolean }[] = [];

    // Busca todas as subscriptions em trialing com trial_end definido
    const { data: trialingSubscriptions, error: subError } = await admin
      .from("subscriptions")
      .select(`
        id,
        company_id,
        trial_end,
        trial_reminder_5d_sent_at,
        trial_reminder_3d_sent_at,
        trial_reminder_1d_sent_at
      `)
      .eq("status", "trialing")
      .not("trial_end", "is", null);

    if (subError) throw subError;

    if (!trialingSubscriptions || trialingSubscriptions.length === 0) {
      console.log("[cron/trial-ending] Nenhuma subscription em trial encontrada.");
      return NextResponse.json({ ok: true, processed: 0, details: [] });
    }

    for (const sub of trialingSubscriptions) {
      const trialEndDate = new Date(sub.trial_end);
      const diffMs = trialEndDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Só processa se o trial ainda não acabou e está dentro da janela de aviso (1 a 5 dias)
      if (daysLeft < 0 || daysLeft > 5) continue;

      // Verifica qual reminder se aplica hoje
      const applicableReminder = REMINDERS.find((r) => {
        // O reminder é aplicável se o número de dias restantes é <= ao threshold
        // e o e-mail ainda não foi enviado
        return (
          daysLeft <= r.days &&
          !sub[r.field as keyof typeof sub]
        );
      });

      if (!applicableReminder) continue;

      // Busca dados da empresa para pegar e-mail e nome
      const { data: company } = await admin
        .from("companies")
        .select("id, name, email")
        .eq("id", sub.company_id)
        .single();

      if (!company?.email) {
        console.warn(`[cron/trial-ending] Empresa ${sub.company_id} sem e-mail cadastrado.`);
        continue;
      }

      const trialEndFormatted = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(trialEndDate);

      try {
        await resend.emails.send({
          from: "Chopp Hub <suporte@chopphub.com>",
          to: [company.email],
          subject: daysLeft === 1
            ? `🚨 Último dia do trial Chopp Hub — Adicione seu cartão agora`
            : `⏳ Seu trial no Chopp Hub termina em ${daysLeft} dias`,
          html: buildEmailHtml(company.name, daysLeft, trialEndFormatted, siteUrl),
        });

        // Marca o reminder como enviado
        await admin
          .from("subscriptions")
          .update({
            [applicableReminder.field]: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        console.log(
          `[cron/trial-ending] E-mail de ${applicableReminder.label} enviado para ${company.email} (trial termina em ${trialEndFormatted})`
        );

        results.push({
          companyId: sub.company_id,
          email: company.email,
          daysLeft,
          sent: true,
        });
      } catch (emailErr) {
        console.error(
          `[cron/trial-ending] Erro ao enviar e-mail para ${company.email}:`,
          emailErr
        );
        results.push({
          companyId: sub.company_id,
          email: company.email,
          daysLeft,
          sent: false,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      details: results,
    });
  } catch (e: any) {
    console.error("[cron/trial-ending] Erro:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
