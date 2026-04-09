import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";
import { sendBoletoEmailIfReady, BoletoReminderType } from "@/lib/asaas/sendBoletoEmail";
import dayjs from "dayjs";

/**
 * Rota de Cron para processamento diário de lembretes de boleto.
 * Sugestão de agendamento: Diariamente às 08:30 AM.
 */
export async function GET(req: Request) {
  try {
    // 0. Verificação de Segurança (Vercel Cron)
    const authHeader = req.headers.get("authorization");
    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = await createRouteSupabaseClient();

    // 1. Definição das datas de interesse (YYYY-MM-DD)
    const today = dayjs().format("YYYY-MM-DD");
    const dueIn3Days = dayjs().add(3, "days").format("YYYY-MM-DD");
    const overdue3Days = dayjs().subtract(3, "days").format("YYYY-MM-DD");

    console.log(`[BoletoCron] Iniciando processamento. Datas: Hoje(${today}), Vence em 3d(${dueIn3Days}), Atrasado 3d(${overdue3Days})`);

    // 2. Buscar todos os pedidos 'Unpaid' que possuem boleto e estão nos intervalos de lembrete
    // Filtramos no banco apenas os que têm chance de precisar de envio
    const { data: candidates, error: fetchErr } = await supabase
      .from("orders")
      .select("id, company_id, due_date, reminder_3d_before_sent_at, reminder_today_sent_at, reminder_3d_after_sent_at")
      .eq("payment_status", "Unpaid")
      .not("boleto_url", "is", null)
      .or(`due_date.eq.${today},due_date.eq.${dueIn3Days},due_date.eq.${overdue3Days}`);

    if (fetchErr) {
      console.error("[BoletoCron] Erro ao buscar pedidos:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ message: "Nenhum lembrete para processar hoje." });
    }

    const results = {
      processed: candidates.length,
      sent_3d_before: 0,
      sent_today: 0,
      sent_3d_after: 0,
      ignored_already_sent: 0,
      errors: 0,
    };

    // 3. Iterar e disparar os e-mails
    for (const order of candidates) {
      let type: BoletoReminderType | null = null;

      if (order.due_date === dueIn3Days && !order.reminder_3d_before_sent_at) {
        type = "3d_before";
      } else if (order.due_date === today && !order.reminder_today_sent_at) {
        type = "today";
      } else if (order.due_date === overdue3Days && !order.reminder_3d_after_sent_at) {
        type = "3d_after";
      }

      if (type) {
        try {
          const { sent, reason } = await sendBoletoEmailIfReady(
            order.id,
            order.company_id,
            supabase,
            type
          );

          if (sent) {
            if (type === "3d_before") results.sent_3d_before++;
            if (type === "today") results.sent_today++;
            if (type === "3d_after") results.sent_3d_after++;
          } else if (reason === "already_sent") {
            results.ignored_already_sent++;
          }
        } catch (err) {
          console.error(`[BoletoCron] Erro ao processar pedido ${order.id}:`, err);
          results.errors++;
        }
      } else {
        results.ignored_already_sent++;
      }
    }

    console.log("[BoletoCron] Resumo:", results);

    return NextResponse.json({
      ok: true,
      results,
      dates: { today, dueIn3Days, overdue3Days }
    });
  } catch (err: any) {
    console.error("[BoletoCron] Erro crítico:", err);
    return NextResponse.json({ error: "Erro interno no cron de lembretes" }, { status: 500 });
  }
}
