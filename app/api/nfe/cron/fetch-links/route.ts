import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAndStoreNfeFiles } from "@/lib/focus-nfe/fetchAndStoreNfeFiles";
import { sendNfeEmailIfReady } from "@/lib/nfe/sendNfeEmail";

/**
 * Cron Job para buscar links de NF-e autorizadas que ainda não foram baixados.
 * Isso remove a necessidade do usuário manter a aba aberta para processar as notas.
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

    // Usamos Service Role para garantir que consigamos ler e atualizar todas as notas
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("[NFeCron] Iniciando busca de links para notas autorizadas sem PDF/XML...");

    // 1. Buscar notas que estão autorizadas mas não têm links salvos
    // Limitamos a notas dos últimos 30 dias para evitar processamento infinito de notas antigas
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: invoices, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, ref, company_id, status")
      .ilike("status", "%autorizad%")
      .or("danfe_url.is.null,xml_url.is.null")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(20); // Processamos em lotes de 20 para evitar timeout

    if (fetchErr) {
      console.error("[NFeCron] Erro ao buscar invoices:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ message: "Nenhuma nota pendente de processamento encontrada." });
    }

    const results = {
      total: invoices.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 2. Processar cada nota
    for (const inv of invoices) {
      try {
        const stored = await fetchAndStoreNfeFiles(inv.ref, inv.id, inv.company_id);

        if (stored.success) {
          results.success++;
          // Trigger de e-mail se os links foram obtidos agora
          await sendNfeEmailIfReady(inv.id, inv.company_id, supabase).catch(err => 
            console.error(`[NFeCron] Erro ao enviar email para a nota ${inv.id}:`, err)
          );
        } else {
          results.failed++;
          results.errors.push(`Nota ${inv.id}: ${stored.error}`);
        }
      } catch (err: any) {
        console.error(`[NFeCron] Erro ao processar nota ${inv.id}:`, err);
        results.failed++;
        results.errors.push(`Nota ${inv.id}: ${err.message || "Erro desconhecido"}`);
      }
    }

    console.log("[NFeCron] Processamento concluído:", results);

    return NextResponse.json({
      ok: true,
      results
    });
  } catch (err: any) {
    console.error("[NFeCron] Erro crítico:", err);
    return NextResponse.json({ error: "Erro interno no cron de NF-e" }, { status: 500 });
  }
}
