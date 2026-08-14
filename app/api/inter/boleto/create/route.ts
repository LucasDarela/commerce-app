import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getInterCredsForCompany,
  createInterCobranca,
  type InterCobranca,
} from "@/lib/inter";
import { sendBoletoEmailIfReady } from "@/lib/asaas/sendBoletoEmail";

const bodySchema = z.object({
  customerId: z.union([z.string(), z.number()]),
  value: z.number().positive(),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "appointmentDate deve ser YYYY-MM-DD"),
  daysTicket: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  orderId: z.string().uuid().optional(),
  seuNumero: z.string().max(15).optional(), // referência interna (max 15 chars Inter)
  finePercent: z.number().nonnegative().max(10).optional(),
  interestPercentMonth: z.number().nonnegative().max(1).optional(),
  discountValue: z.number().nonnegative().optional(),
  discountDueDateLimitDays: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const {
      customerId,
      value,
      appointmentDate,
      daysTicket,
      description,
      orderId,
      seuNumero,
      finePercent,
      interestPercentMonth,
      discountValue,
      discountDueDateLimitDays,
    } = bodySchema.parse(await req.json());

    // ─── Empresa do usuário ───────────────────────────────────────────────────
    const { data: comp, error: compErr } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();

    if (compErr || !comp?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado" },
        { status: 403 },
      );
    }
    const companyId = comp.company_id;

    // ─── Credenciais Inter ────────────────────────────────────────────────────
    const creds = await getInterCredsForCompany(supabase, companyId);

    // ─── Cliente local ────────────────────────────────────────────────────────
    const idFilter =
      typeof customerId === "number" ? String(customerId) : customerId;

    const { data: local, error: cliErr } = await supabase
      .from("customers")
      .select("id, company_id, name, document, email, phone, zip_code, address, number, neighborhood, city, state")
      .eq("id", idFilter)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cliErr) {
      return NextResponse.json({ error: cliErr.message }, { status: 400 });
    }
    if (!local) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!local.document) {
      return NextResponse.json(
        { error: "CPF/CNPJ do cliente não cadastrado. Atualize o cadastro do cliente." },
        { status: 400 },
      );
    }

    // ─── Calcular vencimento ──────────────────────────────────────────────────
    const base = new Date(`${appointmentDate}T00:00:00`);
    const dueDate = new Date(base);
    dueDate.setDate(dueDate.getDate() + (daysTicket ?? 12));
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    // ─── Validar pedido e Sincronizar Existente ───────────────────────────────
    if (orderId) {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("id, boleto_id, boleto_url")
        .eq("id", orderId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (!orderRow) {
        return NextResponse.json(
          { error: "Pedido inválido para este usuário/empresa" },
          { status: 403 },
        );
      }

      // Se já tem um boleto criado no Inter, apenas sincroniza
      if (orderRow.boleto_id) {
        const { interFetch } = await import("@/lib/inter");
        try {
          const detail: any = await interFetch(creds, `/cobrancas/${orderRow.boleto_id}`, { method: "GET" });
          const resLinha = detail?.boleto?.linhaDigitavel || detail?.linhaDigitavel;
          const resBarras = detail?.boleto?.codigoBarras || detail?.codigoBarras;
          const resLink = `/api/inter/boleto/${orderRow.boleto_id}/pdf`;
          const resPix = detail?.pix?.pixCopiaECola || detail?.pixCopiaECola;

          if (resLink) {
            await supabase.from("orders").update({
              boleto_url: resLink,
              boleto_digitable_line: resLinha,
              boleto_barcode_number: resBarras
            }).eq("id", orderId);
          }

          return NextResponse.json({
            ok: true,
            codigoSolicitacao: orderRow.boleto_id,
            digitableLine: resLinha,
            barcode: resBarras,
            boletoUrl: resLink || orderRow.boleto_url,
            pixCopiaECola: resPix,
          });
        } catch (err: any) {
          console.warn("[Inter] Falha ao sincronizar boleto existente:", err?.message || err);
        }
      }
    }

    // ─── Montar payload Inter ─────────────────────────────────────────────────
    const cpfCnpj = (local.document as string).replace(/\D/g, "");
    const referencia = seuNumero ?? orderId?.replace(/-/g, "").slice(0, 15) ?? Date.now().toString().slice(-15);

    let rawPhone = local.phone?.replace(/\D/g, "") || "";
    if (rawPhone.startsWith("55") && (rawPhone.length === 12 || rawPhone.length === 13)) {
      rawPhone = rawPhone.slice(2);
    }
    const ddd = rawPhone.length >= 10 ? rawPhone.slice(0, 2) : undefined;
    const telefone = rawPhone.length >= 10 ? rawPhone.slice(2).slice(0, 9) : undefined;

    const payload: InterCobranca = {
      seuNumero: referencia,
      valorNominal: value,
      dataVencimento: dueDateStr,
      pagador: {
        cpfCnpj,
        tipoPessoa: cpfCnpj.length === 14 ? "JURIDICA" : "FISICA",
        nome: local.name,
        email: local.email ?? undefined,
        ddd,
        telefone,
        cep: local.zip_code?.replace(/\D/g, "") ?? undefined,
        endereco: local.address ?? undefined,
        numero: local.number ?? undefined,
        bairro: local.neighborhood ?? undefined,
        cidade: local.city ?? undefined,
        uf: (local.state as string | null)?.slice(0, 2).toUpperCase() ?? undefined,
      },
      formasRecebimento: ["BOLETO", "PIX"],
    };

    if (description) {
      payload.mensagem = { linha1: description.slice(0, 77) };
    }

    if (typeof finePercent === "number" && finePercent > 0) {
      payload.multa = { codigoMulta: "PERCENTUAL", taxa: finePercent };
    }

    if (typeof interestPercentMonth === "number" && interestPercentMonth > 0) {
      payload.mora = { codigoMora: "TAXAMENSAL", taxa: interestPercentMonth };
    }

    if (typeof discountValue === "number" && discountValue > 0) {
      payload.desconto = {
        codigoDesconto: "VALORFIXODATAINFORMADA",
        valor: discountValue,
        quantidadeDias: discountDueDateLimitDays ?? 0,
      };
    }

    // ─── Criar cobrança ───────────────────────────────────────────────────────
    const result = await createInterCobranca(creds, payload);

    // ─── Atualizar order ──────────────────────────────────────────────────────
    if (orderId) {
      const update: Record<string, any> = {
        boleto_id: result.codigoSolicitacao,
        boleto_url: result.linkVisualizacao,
        boleto_digitable_line: result.linhaDigitavel,
        boleto_barcode_number: result.codigoBarras,
        due_date: dueDateStr,
        issue_date: appointmentDate,
        payment_status: "Unpaid",
      };

      const { error: updErr } = await supabase
        .from("orders")
        .update(update)
        .eq("id", orderId);

      if (updErr) {
        console.error("❌ [Inter] Falha ao atualizar order:", updErr.message);
      } else if (result.linhaDigitavel) {
        // Só dispara e-mail se já temos a linha digitável
        sendBoletoEmailIfReady(orderId, companyId, supabase).catch((err) =>
          console.error("[inter/boleto/create] Erro ao disparar email:", err),
        );
      }
    }

    return NextResponse.json({
      ok: true,
      codigoSolicitacao: result.codigoSolicitacao,
      digitableLine: result.linhaDigitavel,
      barcode: result.codigoBarras,
      boletoUrl: result.linkVisualizacao,
      pixCopiaECola: result.pixCopiaECola,
    });
  } catch (e: any) {
    console.error("❌ [Inter] Criar boleto - erro:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao criar boleto Inter" },
      { status: 400 },
    );
  }
}
