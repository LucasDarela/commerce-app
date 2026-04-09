import { NextResponse } from "next/server";
import { z } from "zod";
import { asaasFetch } from "@/lib/asaas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendBoletoEmailIfReady } from "@/lib/asaas/sendBoletoEmail";

const bodySchema = z.object({
  customerId: z.union([z.string(), z.number()]),
  value: z.number().positive(),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "appointmentDate deve ser YYYY-MM-DD"),
  daysTicket: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  postalService: z.boolean().optional(),
  discountValue: z.number().nonnegative().optional(),
  discountDueDateLimitDays: z.number().int().nonnegative().optional(),
  finePercent: z.number().nonnegative().max(2).optional(),
  interestPercentMonth: z.number().nonnegative().max(1).optional(),
  orderId: z.string().uuid().optional(),
});

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

    const {
      customerId,
      value,
      appointmentDate,
      daysTicket,
      description,
      postalService,
      discountValue,
      discountDueDateLimitDays,
      finePercent,
      interestPercentMonth,
      orderId,
    } = bodySchema.parse(await req.json());

    const base = new Date(`${appointmentDate}T00:00:00`);
    const dateToCalculate = new Date(base);
    dateToCalculate.setDate(dateToCalculate.getDate() + (daysTicket ?? 12));
    const dueDate = dateToCalculate.toISOString().slice(0, 10);

    const idFilter =
      typeof customerId === "number" ? String(customerId) : customerId;

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

    const { data: local, error: cliErr } = await supabase
      .from("customers")
      .select("id, company_id, name, asaas_customer_id")
      .eq("id", idFilter)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cliErr) {
      return NextResponse.json({ error: cliErr.message }, { status: 400 });
    }

    if (!local) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (!local.asaas_customer_id) {
      return NextResponse.json(
        { error: "Cliente não sincronizado com o Asaas" },
        { status: 400 },
      );
    }

    const payload: Record<string, any> = {
      customer: local.asaas_customer_id,
      billingType: "BOLETO",
      value,
      dueDate,
      description,
      postalService: postalService ?? false,
    };

    if (typeof finePercent === "number") {
      payload.fine = { value: finePercent, type: "PERCENTAGE" };
    }

    if (typeof interestPercentMonth === "number") {
      payload.interest = {
        value: interestPercentMonth,
        type: "PERCENTAGE_PER_MONTH",
      };
    }

    if (typeof discountValue === "number" && discountValue > 0) {
      payload.discount = {
        value: discountValue,
        type: "FIXED",
        dueDateLimitDays: discountDueDateLimitDays ?? 0,
      };
    }

    const created = await asaasFetch<any>(
      supabase,
      companyId,
      "/payments",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const digitableLine =
      created.identificationField ?? created.digitableLine ?? null;
    const barcode = created.bankSlipBarcode ?? null;
    const boletoUrl = created.bankSlipUrl ?? created.invoiceUrl ?? null;

if (orderId) {
  console.log("[asaas/payments/create] orderId:", orderId);

  const { data: orderRow } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!orderRow) {
    return NextResponse.json(
      { error: "Pedido inválido para este usuário/empresa" },
      { status: 403 },
    );
  }

      const issueDate = appointmentDate;

      const update: Record<string, any> = {
        boleto_id: created.id,
        boleto_url: boletoUrl,
        boleto_digitable_line: digitableLine,
        boleto_barcode_number: barcode,
        due_date: dueDate,
        issue_date: issueDate,
        payment_status: "Unpaid",
      };

      const { error: updErr } = await supabase
        .from("orders")
        .update(update)
        .eq("id", orderId);

      if (updErr) {
        console.error(
          "❌ Falha ao atualizar order com dados do boleto:",
          updErr.message,
        );
      } else {
        // Envio automático de e-mail do boleto
        sendBoletoEmailIfReady(orderId, companyId, supabase).catch((err) =>
          console.error("[asaas/payments/create] Erro ao disparar email:", err),
        );
      }
    }

    return NextResponse.json({
      ok: true,
      asaasPaymentId: created.id,
      digitableLine,
      barcode,
      boletoUrl,
      payment: created,
    });
  } catch (e: any) {
    console.error("❌ Create boleto - erro:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao criar boleto" },
      { status: 400 },
    );
  }
}