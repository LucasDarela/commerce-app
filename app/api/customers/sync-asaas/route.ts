import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AsaasCustomer,
  createCustomer,
  diffCustomer,
  findCustomer,
  updateCustomer,
} from "@/lib/asaas";
import { z } from "zod";

const bodySchema = z.object({
  customerId: z.union([z.number(), z.string()]),
});

function normalizeCpfCnpj(v?: string | null) {
  return v ? v.replace(/\D/g, "") : undefined;
}

function normalizePhoneBR(v?: string | null) {
  if (!v) return undefined;
  let d = String(v).replace(/\D/g, "");
  if (d.startsWith("55")) d = d.slice(2);
  if (d.length >= 1 && d[0] === "0") d = d.slice(1);
  if (d.length === 10 || d.length === 11) return d;
  return d || undefined;
}

function mapToAsaasCustomer(row: any): AsaasCustomer & Record<string, any> {
  const phoneDigits = normalizePhoneBR(row?.phone);
  const mobileDigits = normalizePhoneBR(row?.mobile_phone ?? row?.cellphone);

  let phone: string | undefined = undefined;
  let mobilePhone: string | undefined = undefined;

  if (mobileDigits) {
    mobilePhone = mobileDigits;
  }
  if (phoneDigits) {
    if (!mobilePhone && phoneDigits.length === 11) {
      mobilePhone = phoneDigits;
    } else {
      phone = phoneDigits;
    }
  }

  return {
    name: row?.name ?? "",
    cpfCnpj: normalizeCpfCnpj(row?.document),
    email: row?.email || undefined,
    phone,
    mobilePhone,
    postalCode: row?.zip_code?.replace(/\D/g, "") || undefined,
    address: row?.address || undefined,
    addressNumber: row?.number || undefined,
    complement: row?.complement || undefined,
    company: row?.fantasy_name || undefined,
    stateInscription: row?.state_registration || undefined,
    externalReference: row?.id,
  };
}

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

    const { customerId } = bodySchema.parse(await req.json());

    const { data: companyRow, error: compErr } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();

    if (compErr || !companyRow?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado" },
        { status: 403 },
      );
    }

    const companyId = companyRow.company_id;
    const idFilter =
      typeof customerId === "number" ? String(customerId) : customerId;

    const { data: row, error: cErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", idFilter)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 400 });
    }

    if (!row) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    const desired = mapToAsaasCustomer(row);

    if (!desired.name) {
      return NextResponse.json(
        { error: "Nome é obrigatório para o Asaas" },
        { status: 400 },
      );
    }

    if (!desired.cpfCnpj && !desired.email) {
      return NextResponse.json(
        { error: "Informe CPF/CNPJ ou e-mail para sincronizar com o Asaas" },
        { status: 400 },
      );
    }

    let asaasId: string | null = row.asaas_customer_id ?? null;
    let remote: any = null;

    if (!asaasId) {
      remote = await findCustomer(supabase, companyId, {
        cpfCnpj: desired.cpfCnpj,
        email: desired.email,
        name: desired.name,
      });

      if (remote?.id) {
        asaasId = remote.id;

        await supabase
          .from("customers")
          .update({ asaas_customer_id: asaasId })
          .eq("id", customerId)
          .eq("company_id", companyId);
      }
    }

    if (!asaasId) {
      const created = await createCustomer(supabase, companyId, desired);

      await supabase
        .from("customers")
        .update({ asaas_customer_id: created.id })
        .eq("id", customerId)
        .eq("company_id", companyId);

      return NextResponse.json({
        ok: true,
        created: true,
        updated: false,
        asaasCustomerId: created.id,
        customer: created,
      });
    }

    try {
      const patch = diffCustomer(remote ?? {}, desired);

      if (Object.keys(patch).length === 0) {
        return NextResponse.json({
          ok: true,
          created: false,
          updated: false,
          asaasCustomerId: asaasId,
          customer: remote ?? { id: asaasId },
        });
      }

      const updated = await updateCustomer(
        supabase,
        companyId,
        asaasId,
        patch,
      );

      return NextResponse.json({
        ok: true,
        created: false,
        updated: true,
        asaasCustomerId: asaasId,
        customer: updated,
      });
    } catch (e: any) {
      if (e?.status === 404) {
        const created = await createCustomer(supabase, companyId, desired);

        await supabase
          .from("customers")
          .update({ asaas_customer_id: created.id })
          .eq("id", customerId)
          .eq("company_id", companyId);

        return NextResponse.json({
          ok: true,
          created: true,
          updated: false,
          replacedOldId: true,
          asaasCustomerId: created.id,
          customer: created,
        });
      }

      throw e;
    }
  } catch (e: any) {
    console.error("❌ Sync Asaas - erro:", e);
    return NextResponse.json(
      { error: e?.message ?? "Erro inesperado" },
      { status: 400 },
    );
  }
}