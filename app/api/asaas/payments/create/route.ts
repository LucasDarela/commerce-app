// app/api/asaas/payments/create/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import { asaasFetch } from "@/lib/asaas";

const bodySchema = z.object({
  customerId: z.union([z.string(), z.number()]),
  value: z.number().positive(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate deve ser YYYY-MM-DD"),
  description: z.string().optional(),
  postalService: z.boolean().optional(),
  discountValue: z.number().nonnegative().optional(),
  discountDueDateLimitDays: z.number().int().nonnegative().optional(),
  finePercent: z.number().nonnegative().max(2).optional(),
  interestPercentMonth: z.number().nonnegative().max(1).optional(),
  orderId: z.string().uuid().optional(), // <- usaremos para atualizar orders
});

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const {
      customerId,
      value,
      dueDate,
      description,
      postalService,
      discountValue,
      discountDueDateLimitDays,
      finePercent,
      interestPercentMonth,
      orderId,
    } = bodySchema.parse(await req.json());

    const idFilter =
      typeof customerId === "number" ? String(customerId) : customerId;

    // company_id do usuário
    const { data: comp, error: compErr } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();
    if (compErr || !comp?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado" },
        { status: 401 },
      );
    }

    // cliente (tenant-safe)
    const { data: local, error: cliErr } = await supabase
      .from("customers")
      .select("id, company_id, name, asaas_customer_id")
      .eq("id", idFilter)
      .eq("company_id", comp.company_id)
      .maybeSingle();

    if (cliErr)
      return NextResponse.json({ error: cliErr.message }, { status: 400 });
    if (!local)
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    if (!local.asaas_customer_id)
      return NextResponse.json(
        { error: "Cliente não sincronizado com o Asaas" },
        { status: 400 },
      );

    // payload Asaas
    const payload: Record<string, any> = {
      customer: local.asaas_customer_id,
      billingType: "BOLETO",
      value,
      dueDate,
      description,
      postalService: postalService ?? false,
    };
    if (typeof finePercent === "number")
      payload.fine = { value: finePercent, type: "PERCENTAGE" };
    if (typeof interestPercentMonth === "number")
      payload.interest = {
        value: interestPercentMonth,
        type: "PERCENTAGE_PER_MONTH",
      };
    if (typeof discountValue === "number" && discountValue > 0)
      payload.discount = {
        value: discountValue,
        type: "FIXED",
        dueDateLimitDays: discountDueDateLimitDays ?? 0,
      };

    console.log("➡️ Criando boleto no Asaas com payload:", payload);

    const created = await asaasFetch<any>("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const digitableLine =
      created.identificationField ?? created.digitableLine ?? null;
    const barcode = created.bankSlipBarcode ?? null;
    const boletoUrl = created.bankSlipUrl ?? created.invoiceUrl ?? null;

    if (orderId) {
      // garante que o pedido pertence à mesma company
      const { data: orderRow } = await supabase
        .from("orders")
        .select("id, company_id")
        .eq("id", orderId)
        .maybeSingle();

      if (!orderRow || orderRow.company_id !== comp.company_id) {
        return NextResponse.json(
          { error: "Pedido inválido para este usuário/empresa" },
          { status: 403 },
        );
      }

      const issueDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const update: Record<string, any> = {
        boleto_id: created.id,
        boleto_url: boletoUrl,
        boleto_digitable_line: digitableLine,
        boleto_barcode_number: barcode,
        due_date: dueDate,
        issue_date: issueDate,
        payment_status: "Unpaid", // se quiser marcar como pendente
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
      }
    }

    const response = {
      ok: true,
      asaasPaymentId: created.id,
      digitableLine,
      barcode,
      boletoUrl,
      payment: created,
    };

    console.log("📦 Resposta enviada pro front (boleto criado):", response);
    return NextResponse.json(response);
  } catch (e: any) {
    console.error("❌ Create boleto - erro:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao criar boleto" },
      { status: 400 },
    );
  }
}
