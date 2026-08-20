import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSicoobCredsForCompany, createSicoobBoleto, type SicoobBoleto } from "@/lib/sicoob";
import { sendBoletoEmailIfReady } from "@/lib/asaas/sendBoletoEmail";

const bodySchema = z.object({
  customerId: z.union([z.string(), z.number()]),
  value: z.number().positive(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "appointmentDate deve ser YYYY-MM-DD"),
  daysTicket: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  orderId: z.string().uuid().optional(),
  seuNumero: z.string().max(10).optional(),
  finePercent: z.number().nonnegative().optional(),
  interestPercentMonth: z.number().nonnegative().optional(),
  discountValue: z.number().nonnegative().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { customerId, value, appointmentDate, daysTicket, description, orderId, seuNumero, finePercent, interestPercentMonth, discountValue } =
      bodySchema.parse(await req.json());

    const { data: comp, error: compErr } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();
    if (compErr || !comp?.company_id)
      return NextResponse.json({ error: "company_id não encontrado" }, { status: 403 });
    const companyId = comp.company_id;

    const creds = await getSicoobCredsForCompany(supabase, companyId);

    const idFilter = typeof customerId === "number" ? String(customerId) : customerId;
    const { data: local, error: cliErr } = await supabase
      .from("customers")
      .select("id, company_id, name, document, email, phone, zip_code, address, number, neighborhood, city, state")
      .eq("id", idFilter)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cliErr) return NextResponse.json({ error: cliErr.message }, { status: 400 });
    if (!local) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    if (!local.document)
      return NextResponse.json({ error: "CPF/CNPJ do cliente não cadastrado. Atualize o cadastro do cliente." }, { status: 400 });

    // Calcular vencimento
    const base = new Date(`${appointmentDate}T00:00:00`);
    const dueDate = new Date(base);
    dueDate.setDate(dueDate.getDate() + (daysTicket ?? 12));
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const cpfCnpj = (local.document as string).replace(/\D/g, "");
    const referencia = seuNumero ?? orderId?.replace(/-/g, "").slice(0, 10) ?? Date.now().toString().slice(-10);

    const payload: SicoobBoleto = {
      numeroContrato: creds.numeroContrato,
      modalidade: 1,
      numeroContaCorrente: creds.numeroConta,
      especieDocumento: "DM",
      dataEmissao: appointmentDate,
      seuNumero: referencia,
      valor: value,
      dataVencimento: dueDateStr,
      hibrido: true,
      pagador: {
        nomeRazaoSocial: local.name,
        numeroCpfCnpj: cpfCnpj,
        codigoTipoInscricao: cpfCnpj.length === 14 ? 2 : 1,
        endereco: local.address ?? undefined,
        bairro: local.neighborhood ?? undefined,
        cidade: local.city ?? undefined,
        uf: (local.state as string | null)?.slice(0, 2).toUpperCase() ?? undefined,
        cep: local.zip_code?.replace(/\D/g, "") ?? undefined,
        email: local.email ?? undefined,
      },
    };

    if (description) {
      payload.mensagem = { linha1: description.slice(0, 77) };
    }

    if (typeof finePercent === "number" && finePercent > 0) {
      payload.multa = { codigoMulta: 2, taxa: finePercent };
    }

    if (typeof interestPercentMonth === "number" && interestPercentMonth > 0) {
      payload.mora = { codigoMora: 3, taxa: interestPercentMonth };
    }

    if (typeof discountValue === "number" && discountValue > 0) {
      payload.desconto = { codigoDesconto: 1, valor: discountValue };
    }

    const result = await createSicoobBoleto(creds, payload);

    if (orderId) {
      const update: Record<string, any> = {
        boleto_id: result.codigoSolicitacao,
        boleto_url: result.urlBoleto,
        boleto_digitable_line: result.linhaDigitavel,
        boleto_barcode_number: result.codigoBarras,
        due_date: dueDateStr,
        issue_date: appointmentDate,
        payment_status: "Unpaid",
      };

      const { error: updErr } = await supabase
        .from("orders")
        .update(update)
        .eq("id", orderId)
        .eq("company_id", companyId);

      if (updErr) {
        console.error("❌ [Sicoob] Falha ao atualizar order:", updErr.message);
      } else if (result.linhaDigitavel) {
        sendBoletoEmailIfReady(orderId, companyId, supabase).catch((err) =>
          console.error("[sicoob/boleto/create] Erro ao disparar email:", err),
        );
      }
    }

    return NextResponse.json({
      ok: true,
      codigoSolicitacao: result.codigoSolicitacao,
      digitableLine: result.linhaDigitavel,
      barcode: result.codigoBarras,
      boletoUrl: result.urlBoleto,
      pixCopiaECola: result.pixCopiaECola,
    });
  } catch (e: any) {
    console.error("❌ [Sicoob] Criar boleto - erro:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Erro ao criar boleto Sicoob" }, { status: 400 });
  }
}
