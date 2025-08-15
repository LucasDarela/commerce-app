import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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

// helpers no topo do arquivo
function normalizePhoneBR(v?: string | null) {
  if (!v) return undefined;
  let d = String(v).replace(/\D/g, ""); // só dígitos
  if (d.startsWith("55")) d = d.slice(2); // remove código do país
  // (opcional) remove zero à esquerda do DDD, se existir
  if (d.length >= 1 && d[0] === "0") d = d.slice(1);
  // retorna só se tiver 10 (fixo) ou 11 (celular) dígitos
  if (d.length === 10 || d.length === 11) return d;
  // se vier algo diferente, ainda assim devolve dígitos para não perder dado
  return d || undefined;
}

/** Mapeia seu modelo -> payload do Asaas (com alguns campos extras suportados) */
function mapToAsaasCustomer(row: any): AsaasCustomer & Record<string, any> {
  // normaliza telefones
  const phoneDigits = normalizePhoneBR(row?.phone);
  const mobileDigits = normalizePhoneBR(row?.mobile_phone ?? row?.cellphone);

  // Regra: se só houver um número, decide campo por tamanho (11 = mobile)
  let phone: string | undefined = undefined;
  let mobilePhone: string | undefined = undefined;

  if (mobileDigits) {
    // se já temos um “mobile” vindo do banco, usa aqui
    mobilePhone = mobileDigits;
  }
  if (phoneDigits) {
    if (!mobilePhone && phoneDigits.length === 11) {
      // 11 dígitos típico de celular com 9 -> tratar como mobilePhone
      mobilePhone = phoneDigits;
    } else {
      phone = phoneDigits;
    }
  }
  return {
    name: row?.name ?? "",
    cpfCnpj: normalizeCpfCnpj(row?.document),
    email: row?.email || undefined,
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
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { customerId } = bodySchema.parse(await req.json());

    // 1) company do usuário (multi-tenant)
    const { data: companyRow, error: compErr } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();

    if (compErr || !companyRow?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado" },
        { status: 401 },
      );
    }
    const companyId = companyRow.company_id as string;

    // 2) carrega cliente local (tenant-safe)
    const { data: row, error: cErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cErr)
      return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!row)
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );

    // 3) valida payload p/ Asaas
    const desired = mapToAsaasCustomer(row);
    if (!desired.name)
      return NextResponse.json(
        { error: "Nome é obrigatório para o Asaas" },
        { status: 400 },
      );
    if (!desired.cpfCnpj && !desired.email)
      return NextResponse.json(
        { error: "Informe CPF/CNPJ ou e-mail para sincronizar com o Asaas" },
        { status: 400 },
      );

    // 4) decide caminho
    let asaasId: string | null = row.asaas_customer_id ?? null;
    let remote: any = null;

    // se não há id salvo, tenta localizar no Asaas por cpfCnpj/email/nome
    if (!asaasId) {
      remote = await findCustomer({
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

    // 5) cria ou atualiza (com tratamento do 404)
    if (!asaasId) {
      // criar do zero
      const created = await createCustomer(desired);

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
    } else {
      // atualizar; se der 404 é ID de outro ambiente → recria e substitui
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

        const updated = await updateCustomer(asaasId, patch);
        return NextResponse.json({
          ok: true,
          created: false,
          updated: true,
          asaasCustomerId: asaasId,
          customer: updated,
        });
      } catch (e: any) {
        if (e?.status === 404) {
          // id antigo (ex.: sandbox) → recria no ambiente atual e troca vínculo
          const created = await createCustomer(desired);

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
        // outros erros: propaga
        throw e;
      }
    }
  } catch (e: any) {
    console.error("❌ Sync Asaas - erro:", e);
    return NextResponse.json(
      { error: e?.message ?? "Erro inesperado" },
      { status: 400 },
    );
  }
}
