// lib/focus-nfe/emitInvoice.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type EmitParams = {
  companyId: string;
  invoiceData: any; // já validado no invoiceSchema
  supabaseClient: SupabaseClient;
};

const pad2 = (v: any) => String(v ?? "").padStart(2, "0");
const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");
const to8Digits = (v?: string) => {
  const only = (v ?? "").replace(/\D/g, "");
  return only.length === 8 ? only : "";
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function distributeFreight(totalFreight: number, items: any[]) {
  const freight = Number(totalFreight || 0);
  if (!freight || !items?.length) return items.map(() => 0);

  const bases = items.map((it) =>
    Number(it.valor_bruto ?? it.valor_bruto_produto ?? 0),
  );
  const sum = bases.reduce((a, b) => a + b, 0);
  if (!sum) return items.map(() => 0);

  let allocated = 0;

  return bases.map((base, idx) => {
    if (idx === bases.length - 1) {
      return round2(freight - allocated);
    }
    const part = round2((base / sum) * freight);
    allocated = round2(allocated + part);
    return part;
  });
}

export async function emitInvoice({
  companyId,
  invoiceData,
  supabaseClient,
}: EmitParams) {
  // 1) Credenciais Focus + ambiente
  const { data: cred, error: credErr } = await supabaseClient
    .from("nfe_credentials")
    .select("id, company_id, focus_token, environment")
    .eq("company_id", companyId)
    .maybeSingle();

  if (credErr || !cred?.focus_token) {
    throw new Error("Token da Focus NFe não configurado para essa empresa.");
  }

  const env = (cred.environment ?? "homologacao") as "homologacao" | "producao";
  const baseURL =
    env === "producao"
      ? "https://api.focusnfe.com.br/v2"
      : "https://homologacao.focusnfe.com.br/v2";

  const token = String(cred.focus_token)
    .trim()
    .replace(/\r?\n|\r/g, "");

  const maskedToken = `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  console.log(
    `[Focus NFe] Usando ambiente: ${env} | Token (mascarado): ${maskedToken}`,
  );

  const auth = `Basic ${Buffer.from(`${token}:`).toString("base64")}`;

  // 1 = Simples; 4 = MEI; 3 = Regime normal
  const { data: comp } = await supabaseClient
    .from("companies")
    .select("regime_tributario")
    .eq("id", companyId)
    .maybeSingle();

  const crt = Number(comp?.regime_tributario);
  const isSN = crt === 1 || crt === 2 || crt === 4;

  // 3) Normalizações de emitente/destinatário
  if (invoiceData?.emitente?.cpf_cnpj)
    invoiceData.emitente.cpf_cnpj = onlyDigits(invoiceData.emitente.cpf_cnpj);
  if (invoiceData?.emitente?.endereco?.cep)
    invoiceData.emitente.endereco.cep = onlyDigits(
      invoiceData.emitente.endereco.cep,
    );

  if (invoiceData?.destinatario?.cpf_cnpj)
    invoiceData.destinatario.cpf_cnpj = onlyDigits(
      invoiceData.destinatario.cpf_cnpj,
    );
  if (invoiceData?.destinatario?.telefone)
    invoiceData.destinatario.telefone = onlyDigits(
      invoiceData.destinatario.telefone,
    );
  if (invoiceData?.destinatario?.endereco?.cep)
    invoiceData.destinatario.endereco.cep = onlyDigits(
      invoiceData.destinatario.endereco.cep,
    );

  const items: any[] =
    (invoiceData as any).itens ?? (invoiceData as any).items ?? [];

  const totalFreight = Number(invoiceData.valor_frete || 0);
  const freightParts = distributeFreight(totalFreight, items);

  const payload = {
    // envie apenas os campos aceitos pela Focus (opcional, mas limpo)
    ref: invoiceData.ref,
    ambiente: env === "producao" ? "1" : "2",
    // note_number: invoiceData.note_number,
    // order_id: invoiceData.order_id,
    data_emissao: invoiceData.data_emissao,
    data_entrada_saida: invoiceData.data_entrada_saida,
    natureza_operacao: invoiceData.natureza_operacao,
    tipo_documento: invoiceData.tipo_documento,
    finalidade_emissao: invoiceData.finalidade_emissao,
    modalidade_frete: invoiceData.modalidade_frete,
    valor_frete: invoiceData.valor_frete,
    valor_seguro: invoiceData.valor_seguro,
    valor_produtos: invoiceData.valor_produtos,
    valor_total: invoiceData.valor_total,
    id_dest: invoiceData.id_dest || 1,
    consumidor_final: invoiceData.consumidor_final || 1,
    nome_emitente: invoiceData.nome_emitente,
    nome_fantasia_emitente: invoiceData.nome_fantasia_emitente,
    cnpj_emitente: invoiceData.cnpj_emitente,
    inscricao_estadual_emitente: invoiceData.inscricao_estadual_emitente,
    logradouro_emitente: invoiceData.logradouro_emitente,
    numero_emitente: invoiceData.numero_emitente,
    bairro_emitente: invoiceData.bairro_emitente,
    municipio_emitente: invoiceData.municipio_emitente,
    uf_emitente: invoiceData.uf_emitente,
    cep_emitente: invoiceData.cep_emitente,

    // destinatário (cpf_ OU cnpj_)
    cpf_destinatario: (invoiceData as any).cpf_destinatario,
    cnpj_destinatario: (invoiceData as any).cnpj_destinatario,
    nome_destinatario: invoiceData.nome_destinatario,
    telefone_destinatario: invoiceData.telefone_destinatario,
    inscricao_estadual_destinatario:
      invoiceData.inscricao_estadual_destinatario,
    logradouro_destinatario: invoiceData.logradouro_destinatario,
    numero_destinatario: invoiceData.numero_destinatario,
    bairro_destinatario: invoiceData.bairro_destinatario,
    municipio_destinatario: invoiceData.municipio_destinatario,
    uf_destinatario: invoiceData.uf_destinatario,
    cep_destinatario: invoiceData.cep_destinatario,
    pais_destinatario: invoiceData.pais_destinatario,
    indicador_inscricao_estadual_destinatario: invoiceData.indicador_inscricao_estadual_destinatario || 9,
 
    presenca_comprador: invoiceData.presenca_comprador,
 
    // Manual numbering (optional)
    ...(invoiceData.numero ? { numero: invoiceData.numero } : {}),
    ...(invoiceData.serie ? { serie: invoiceData.serie } : {}),
 
    url_notificacao: `${
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://www.chopphub.com"
    }/api/nfe/webhook`,



    // 👈 AQUI: envie o ARRAY completo
    itens: items.map((it, idx) => {
      const isCST60 =
        String(it.icms_situacao_tributaria) === "60" ||
        String(it.icms_situacao_tributaria) === "500";

      return {
        numero_item: it.numero_item,
        codigo_produto: it.codigo_produto,
        descricao: it.descricao,
        cfop: it.cfop,
        codigo_ncm: it.codigo_ncm,
        codigo_cest: it.codigo_cest,
        unidade_comercial: it.unidade_comercial,
        quantidade_comercial: it.quantidade_comercial,
        valor_unitario_comercial: it.valor_unitario_comercial,
        unidade_tributavel: it.unidade_tributavel,
        quantidade_tributavel: it.quantidade_tributavel,
        valor_unitario_tributavel: it.valor_unitario_tributavel,
        valor_bruto_produto: it.valor_bruto ?? it.valor_bruto_produto,
        valor_frete: freightParts[idx] ?? 0,
        icms_origem: String(it.icms_origem ?? "0"),

        ...(isCST60
          ? {
              icms_situacao_tributaria: "60",
              icms_base_calculo_retido_st: Number(it.vbc_st_ret ?? 0),
              icms_aliquota_final: Number(it.pst ?? 0),
              icms_valor_substituto: Number(it.vicms_substituto ?? 0),
              icms_valor_retido_st: Number(it.vicms_st_ret ?? 0),
            }
          : {
              icms_situacao_tributaria: isSN
                ? String(it.icms_situacao_tributaria ?? "102")
                : String(it.icms_situacao_tributaria ?? "00"),
              valor_bc_icms: Number(it.valor_bc_icms ?? 0),
              aliquota_icms: Number(it.aliquota_icms ?? 0),
              valor_icms: Number(it.valor_icms ?? 0),
            }),

        // Reforma Tributária 2026 - Padrão Focus Oficial
        ibs_cbs_situacao_tributaria: it.ibs_cbs_situacao_tributaria || "01",
        ibs_uf_aliquota: Number(it.aliquota_ibs ?? 0),
        ibs_uf_valor: Number(it.valor_ibs ?? 0),
        cbs_aliquota: Number(it.aliquota_cbs ?? 0),
        cbs_valor: Number(it.cbs_valor ?? it.valor_cbs ?? 0),

        // Mantém legados/duplicidade segura para garantir o texto nas informações adicionais
        ibs_situacao_tributaria: String(it.ibs_situacao_tributaria ?? "01").padStart(2, "0"),
        aliquota_ibs: Number(it.aliquota_ibs ?? 0),
        valor_ibs: Number(it.valor_ibs ?? 0),
        cbs_situacao_tributaria: String(it.cbs_situacao_tributaria ?? "01").padStart(2, "0"),
        aliquota_cbs: Number(it.aliquota_cbs ?? 0),
        valor_cbs: Number(it.valor_cbs ?? 0),

        // PIS
        pis_situacao_tributaria: String(
          it.pis_situacao_tributaria ?? it.pis ?? "06",
        ).padStart(2, "0"),
        valor_bc_pis: Number(it.valor_bc_pis ?? 0),
        aliquota_pis: Number(it.aliquota_pis ?? 0),
        valor_pis: Number(it.valor_pis ?? 0),

        // COFINS
        cofins_situacao_tributaria: String(
          it.cofins_situacao_tributaria ?? it.cofins ?? "06",
        ).padStart(2, "0"),
        valor_bc_cofins: Number(it.valor_bc_cofins ?? 0),
        aliquota_cofins: Number(it.aliquota_cofins ?? 0),
        valor_cofins: Number(it.valor_cofins ?? 0),

        informacoes_adicionais_item: `IBS: R$ ${Number(it.valor_ibs || 0).toFixed(2)} (${it.aliquota_ibs}%) | CBS: R$ ${Number(it.valor_cbs || 0).toFixed(2)} (${it.aliquota_cbs}%)`,
      };
    }),

    informacoes_adicionais_contribuinte: [
      invoiceData.informacoes_adicionais_contribuinte,
      `Trib. Reforma 2026: IBS Total R$ ${items.reduce((acc, it) => acc + Number(it.valor_ibs || 0), 0).toFixed(2)} | CBS Total R$ ${items.reduce((acc, it) => acc + Number(it.valor_cbs || 0), 0).toFixed(2)}`,
      "Emitido por ChoppHub - Tecnologia para Distribuidores"
    ].filter(Boolean).join(" | ")
  };

  console.log("Focus NFe - Itens Mapeados:", JSON.stringify(payload.itens, null, 2));

  // 5) Referência que vai na query (?ref=)
  const ref =
    invoiceData?.ref ||
    `c${companyId}_s${invoiceData.serie || 1}_n${invoiceData.numero ?? "auto"}`;

  // 6) Sanitize: remove undefined/null
  const finalPayload = JSON.parse(JSON.stringify({ ...payload }));

  console.log("Focus NFe - Payload:", JSON.stringify(finalPayload, null, 2));

  const sumFreightItems = payload.itens.reduce(
    (s: number, it: any) => s + Number(it.valor_frete || 0),
    0,
  );

  console.log("[FRETE CHECK]", {
    total: Number(invoiceData.valor_frete || 0),
    soma_itens: sumFreightItems,
  });

  // antes do fetch
  console.log("[FOCUS REQUEST]", {
    url: `${baseURL}/nfe?ref=${encodeURIComponent(ref)}`,
    payload: finalPayload,
  });

  // 7) Chamada Focus
  const url = `${baseURL}/nfe?ref=${encodeURIComponent(ref)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(finalPayload),
  });

  const rawText = await resp.text();
  let body: any = rawText;
  try {
    body = JSON.parse(rawText);
  } catch {
    // às vezes vem HTML/texto em 5xx
  }

  if (!resp.ok) {
    await supabaseClient.from("nfe_debug").insert({
      company_id: companyId,
      ref,
      order_id: invoiceData.order_id,
      payload: finalPayload,
      response: body,
      status: resp.status,
    });

    const erros = Array.isArray(body?.erros) ? body.erros : [];
    const detalhePrimario =
      body?.mensagem ||
      erros
        .map((e: any) => `${e?.campo ?? ""} ${e?.mensagem ?? ""}`.trim())
        .filter(Boolean)
        .join(" | ") ||
      `Focus retornou status ${resp.status}`;

    const e: any = new Error(detalhePrimario);
    e.focus = body;
    e.status = resp.status;
    e.erros = erros;
    throw e;
  }

  return {
    status: body?.status,
    ref: body?.referencia || ref,
    chave: body?.chave_nfe || null,
    xml_url: body?.links?.xml || null,
    danfe_url: body?.links?.danfe || null,
    raw: body,
  };
}
