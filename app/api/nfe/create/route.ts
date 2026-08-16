// app/api/nfe/create/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { emitInvoice } from "@/lib/focus-nfe/emitInvoice";
import { invoiceSchema } from "@/lib/focus-nfe/invoiceSchema";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";
import { sendNfeEmailIfReady } from "@/lib/nfe/sendNfeEmail";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { invoiceData, companyId: bodyCompanyId } = body;

    if (!invoiceData) {
      return NextResponse.json(
        { error: "invoiceData é obrigatório" },
        { status: 400 },
      );
    }

    // --- Multi-tenant fix: Verify company membership ---
    if (bodyCompanyId && (typeof bodyCompanyId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bodyCompanyId))) {
      return NextResponse.json({ error: "company_id inválido" }, { status: 400 });
    }

    const { data: membership, error: compErr } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("company_id", bodyCompanyId || "")
      .maybeSingle();

    if (compErr || !membership?.company_id) {
      return NextResponse.json(
        { error: "Você não tem permissão para esta empresa ou company_id inválido." },
        { status: 403 },
      );
    }

    const companyId = membership.company_id;

    const parse = invoiceSchema.safeParse(invoiceData);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Dados da nota inválidos", details: parse.error.format() },
        { status: 422 },
      );
    }

    const toIso = (s?: string | null) => {
      if (!s) return new Date().toISOString();
      const d = new Date(s);
      return Number.isNaN(d.getTime())
        ? new Date().toISOString()
        : d.toISOString();
    };

    const dataEmissaoDb = toIso(invoiceData.data_emissao);

    const ATIVOS = [
      "processando_autorizacao",
      "autorizado",
      "autorizada",
    ];

    const { data: ativa } = await supabase
      .from("invoices")
      .select("id, status, ref, numero, serie")
      .eq("company_id", companyId)
      .eq("order_id", invoiceData.order_id)
      .in("status", ATIVOS)
      .limit(1);

    if (ativa && ativa.length) {
      return NextResponse.json(
        { error: "Já existe NF-e ativa para este pedido.", ref: ativa[0].ref },
        { status: 409 },
      );
    }

    const { data: previous } = await supabase
      .from("invoices")
      .select("id, numero, serie, ref, status, note_number, created_at")
      .eq("company_id", companyId)
      .eq("order_id", invoiceData.order_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const prev = previous?.[0];
    const isRetry =
      prev?.status === "nota_rejeitada" || 
      prev?.status === "erro_autorizacao";
    const isCancelledReissue =
      prev?.status === "cancelado" ||
      prev?.status === "cancelada";

    invoiceData.serie = invoiceData.serie || prev?.serie || "1";

    if (!invoiceData.note_number && invoiceData.order_id) {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("note_number")
        .eq("id", invoiceData.order_id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (orderRow?.note_number) {
        invoiceData.note_number = orderRow.note_number;
      }
    }

    if (!invoiceData.note_number) {
      return NextResponse.json(
        { error: "note_number é obrigatório para emissão idempotente" },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Re-emissão após cancelamento: gera novo note_number para evitar erro
    // da SEFAZ "número já aceito" (o número cancelado não pode ser reutilizado)
    // ─────────────────────────────────────────────────────────────────────────
    if (isCancelledReissue) {
      // Busca TODOS os note_numbers da empresa e calcula o máximo numericamente
      // (não usar ORDER BY text pois "9" > "1234" em ordenação alfabética)
      const { data: allNoteData } = await supabase
        .from("invoices")
        .select("note_number")
        .eq("company_id", companyId)
        .not("note_number", "is", null);

      const maxFromInvoices = Math.max(
        0,
        ...(allNoteData?.map((r: any) => Number(r.note_number) || 0) ?? [0]),
      );

      // Também considera o note_number atual do pedido (orders.note_number),
      // pois pode ter sido atualizado por uma tentativa anterior que não salvou no invoices.
      const currentNoteNumber = Number(invoiceData.note_number) || 0;

      const maxNoteNumber = Math.max(maxFromInvoices, currentNoteNumber);
      const newNoteNumber = String(maxNoteNumber + 1);

      console.log("[NFe create] Re-emissão pós-cancelamento:", {
        note_number_do_pedido: invoiceData.note_number,
        max_das_invoices: maxFromInvoices,
        max_considerado: maxNoteNumber,
        note_number_novo: newNoteNumber,
        companyId,
        order_id: invoiceData.order_id,
      });

      invoiceData.note_number = newNoteNumber;

      // Atualiza o note_number no pedido
      await supabase
        .from("orders")
        .update({ note_number: newNoteNumber })
        .eq("id", invoiceData.order_id)
        .eq("company_id", companyId);
    }

    const { data: dup } = await supabase
      .from("invoices")
      .select("id, status, ref, numero")
      .eq("company_id", companyId)
      .eq("serie", invoiceData.serie)
      .eq("note_number", invoiceData.note_number)
      .in("status", ATIVOS)
      .maybeSingle();

    if (dup) {
      return NextResponse.json(
        { error: "NF-e já emitida para este número/série.", ref: dup.ref },
        { status: 409 },
      );
    }

    const baseRef = `${invoiceData.note_number}`;
    const numSuffix = invoiceData.numero ? `_n${invoiceData.numero}` : "";

    // Para retry de rejeição: reusa a mesma ref. Para re-emissão pós-cancelamento
    // ou nova emissão: gera nova ref com o novo note_number.
    invoiceData.ref =
      (isRetry && prev?.ref) 
        ? prev.ref 
        : `${baseRef}${numSuffix}_s${invoiceData.serie}`;

    console.log("[NFe create] ref gerada:", invoiceData.ref, {
      isRetry,
      isCancelledReissue,
      order_id: invoiceData.order_id,
      note_number: invoiceData.note_number,
      companyId,
      userId: user.id,
    });

    if (!invoiceData.numero && isRetry && prev?.numero && Number(prev.numero) > 0) {
      invoiceData.numero = Number(prev.numero);
    }

    const numeroParaBanco = invoiceData.numero ? Number(invoiceData.numero) : null;

    const result = await emitInvoice({
      companyId,
      invoiceData,
      supabaseClient: supabase,
      // propaga contexto no erro para o catch poder fazer upsert
      extraErrorContext: {
        companyId,
        orderId: invoiceData.order_id,
        noteNumber: invoiceData.note_number,
        serie: invoiceData.serie,
        valorTotal: invoiceData.valor_total,
        naturezaOperacao: invoiceData.natureza_operacao,
        nomeDestinatario: invoiceData.nome_destinatario,
      },
    });

    const numeroDefinitivo = (result as any)?.raw?.numero ?? numeroParaBanco;

    // Para retry de rejeição: atualiza a invoice existente (mesma ref).
    // Para cancelamento ou nova emissão: sempre insere nova linha.
    if (isRetry && prev?.id) {
      const { error: updateErr } = await supabase
        .from("invoices")
        .update({
          numero: numeroDefinitivo,
          serie: invoiceData.serie,
          status: result.status,
          chave_nfe: result.chave || null,
          xml_url: result.xml_url || null,
          danfe_url: result.danfe_url || null,
          data_emissao: dataEmissaoDb,
          natureza_operacao: invoiceData.natureza_operacao,
          customer_name: invoiceData.nome_destinatario,
          ref: invoiceData.ref,
        })
        .eq("id", prev.id)
        .eq("company_id", companyId);

      if (updateErr) {
        console.error("❌ Erro ao atualizar nota rejeitada:", updateErr);
        return NextResponse.json(
          { error: "Emitida, mas falhou ao atualizar." },
          { status: 500 },
        );
      }
    } else {
      const { error: insertErr } = await supabase.from("invoices").insert([
        {
          company_id: companyId,
          order_id: invoiceData.order_id,
          note_number: invoiceData.note_number,
          numero: numeroDefinitivo,
          serie: invoiceData.serie,
          chave_nfe: result.chave || null,
          status: result.status,
          ref: invoiceData.ref,
          valor_total: invoiceData.valor_total,
          xml_url: result.xml_url || null,
          danfe_url: result.danfe_url || null,
          data_emissao: dataEmissaoDb,
          natureza_operacao: invoiceData.natureza_operacao,
          customer_name: invoiceData.nome_destinatario,
        },
      ]);

      if (insertErr) {
        console.error("⚠️ Erro ao inserir invoice:", insertErr);
        return NextResponse.json(
          {
            success: false,
            error: "NF-e emitida na Focus, mas houve erro ao salvar no banco.",
            details: insertErr.message,
          },
          { status: 500 },
        );
      }
    }

    const isAuth = (result.status || "").toLowerCase().includes("autorizad");

    if (isAuth && (!result.xml_url || !result.danfe_url)) {
      const res = await fetchInvoiceStatus({
        supabase,
        companyId,
        ref: result.ref,
        poll: 2,
        intervalMs: 1500,
      });

      if (!("error" in res) && res.data) {
        await supabase
          .from("invoices")
          .update({
            numero: res.data.numero ?? numeroDefinitivo,
            serie: res.data.serie ?? invoiceData.serie,
            chave_nfe: res.data.chave ?? result.chave ?? null,
            xml_url: res.data.xml_url ?? result.xml_url ?? null,
            danfe_url: res.data.danfe_url ?? result.danfe_url ?? null,
            data_emissao: res.data?.data_emissao
              ? toIso(res.data.data_emissao)
              : dataEmissaoDb,
            status: res.data.status ?? result.status,
          })
          .eq("ref", result.ref)
          .eq("company_id", companyId);

        result.xml_url = res.data.xml_url ?? result.xml_url;
        result.danfe_url = res.data.danfe_url ?? result.danfe_url;
      }
    }

    // Tenta enviar o email da NF-e para o cliente de forma assíncrona
    // (não bloqueia a resposta se o envio falhar)
    if (isAuth) {
      const { data: savedInvoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("ref", invoiceData.ref)
        .eq("company_id", companyId)
        .maybeSingle();

      if (savedInvoice?.id) {
        sendNfeEmailIfReady(savedInvoice.id, companyId, supabase).catch((err) =>
          console.error("[NFe create] Erro ao enviar email:", err),
        );
      }
    }

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Erro ao emitir NF-e:", err);

    // ─────────────────────────────────────────────────────────────────────────
    // Tratamento especial: Focus retornou "already_processed"
    // Isso ocorre quando a nota já foi autorizada em uma tentativa anterior
    // mas não foi salva corretamente no banco. Buscamos o estado atual e salvamos.
    // ─────────────────────────────────────────────────────────────────────────
    if (err?.focus?.codigo === "already_processed" && err?.ref) {
      try {
        const supabase2 = await createServerSupabaseClient();
        const { data: membership2 } = await supabase2
          .from("company_users")
          .select("company_id")
          .eq("user_id", (await supabase2.auth.getUser()).data.user?.id ?? "")
          .maybeSingle();

        if (membership2?.company_id) {
          const recovered = await fetchInvoiceStatus({
            supabase: supabase2,
            companyId: membership2.company_id,
            ref: err.ref,
            poll: 5,
            intervalMs: 1500,
            includeRaw: true,
          });

          if (!("error" in recovered) && recovered.data?.status) {
            const toIsoInner = (s?: string | null) => {
              if (!s) return new Date().toISOString();
              const d = new Date(s);
              return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
            };

            const { data: existingInv } = await supabase2
              .from("invoices")
              .select("id")
              .eq("ref", err.ref)
              .eq("company_id", membership2.company_id)
              .maybeSingle();

            const ctx = err.ctx ?? {}; // contexto propagado pelo emitInvoice

            const invPayload: Record<string, any> = {
              status: recovered.data.status,
              numero: recovered.data.numero ?? null,
              serie: recovered.data.serie ?? ctx.serie ?? null,
              chave_nfe: recovered.data.chave ?? null,
              xml_url: recovered.data.xml_url ?? null,
              danfe_url: recovered.data.danfe_url ?? null,
              data_emissao: recovered.data.data_emissao
                ? toIsoInner(recovered.data.data_emissao)
                : new Date().toISOString(),
            };

            if (existingInv?.id) {
              // Atualiza o registro existente
              await supabase2
                .from("invoices")
                .update(invPayload)
                .eq("id", existingInv.id)
                .eq("company_id", membership2.company_id);

              console.log("[NFe create] already_processed: registro atualizado", {
                ref: err.ref, id: existingInv.id,
              });
            } else if (ctx.orderId) {
              // Não existe registro — insere novo card para a nota re-emitida
              const { error: insertRecovErr } = await supabase2.from("invoices").insert([{
                company_id: membership2.company_id,
                order_id: ctx.orderId,
                ref: err.ref,
                note_number: ctx.noteNumber ?? null,
                valor_total: ctx.valorTotal ?? null,
                natureza_operacao: ctx.naturezaOperacao ?? null,
                customer_name: ctx.nomeDestinatario ?? null,
                ...invPayload,
              }]);

              if (insertRecovErr) {
                console.error("[NFe create] already_processed: falha ao inserir:", insertRecovErr);
              } else {
                console.log("[NFe create] already_processed: novo card inserido", {
                  ref: err.ref, order_id: ctx.orderId,
                });
              }
            }

            const isAuthRecovered = (recovered.data.status || "")
              .toLowerCase()
              .includes("autorizad");

            return NextResponse.json(
              {
                success: isAuthRecovered,
                recovered: true,
                result: {
                  status: recovered.data.status,
                  ref: err.ref,
                  chave: recovered.data.chave,
                  xml_url: recovered.data.xml_url,
                  danfe_url: recovered.data.danfe_url,
                },
              },
              { status: 200 },
            );
          }
        }
      } catch (recoverErr) {
        console.error("[NFe create] Falha ao recuperar already_processed:", recoverErr);
      }
    }

    const detalhes: Array<{ campo?: string; codigo?: any; mensagem?: string }> =
      Array.isArray(err?.erros)
        ? err.erros
        : Array.isArray(err?.focus?.erros)
          ? err.focus.erros
          : [];

    const readable = detalhes.map((d, i) => {
      const loc = d?.campo ? `(${d.campo})` : "";
      const cod = d?.codigo ? `[${d.codigo}]` : "";
      return `${i + 1}. ${cod} ${d?.mensagem ?? "Erro"} ${loc}`.trim();
    });

    return NextResponse.json(
      {
        error: err?.message || "Erro interno",
        status: err?.status || 500,
        detalhes,
        detalhes_texto: readable.join("\n"),
        focus: err?.focus || null,
      },
      { status: 500 },
    );
  }
}