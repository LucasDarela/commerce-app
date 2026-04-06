type SupabaseLike = any;

type BuildInvoiceDataParams = {
  supabase: SupabaseLike;
  companyId: string;
  orderId: string;
  operationScope: "inside_state" | "outside_state";
};

function onlyDigits(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function toIntEnum(value: any, allowed: number[], fallback: number) {
  const n = Number(value);
  return allowed.includes(n) ? n : fallback;
}

function toText(value: any, fallback = "") {
  if (value === null || value === undefined) return fallback;

  const normalized = String(value).trim();

  return normalized === "" ? fallback : normalized;
}

function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getAddress(row?: Record<string, any> | null) {
  return {
    address: toText(row?.address),
    number: toText(row?.number, "S/N"),
    neighborhood: toText(row?.neighborhood),
    city: toText(row?.city),
    state: toText(row?.state).toUpperCase(),
    zip_code: onlyDigits(row?.zip_code),
    complement: toText(row?.complement),
  };
}

function normalizeState(value?: string | null) {
  return toText(value).toUpperCase();
}

function getDocumentInfo(customer: Record<string, any>) {
  const document = onlyDigits(customer.document);

  if (document.length === 14) {
    return {
      tipo_pessoa_destinatario: "J",
      cpf_destinatario: undefined,
      cnpj_destinatario: document,
    };
  }

  return {
    tipo_pessoa_destinatario: "F",
    cpf_destinatario: document || undefined,
    cnpj_destinatario: undefined,
  };
}

function buildRef(noteNumber: string, serie: string) {
  return `${noteNumber}_s${serie}`;
}

export async function buildInvoiceDataFromOrder({
  supabase,
  companyId,
  orderId,
  operationScope,
}: BuildInvoiceDataParams) {
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id,
      company_id,
      customer_id,
      customer,
      phone,
      note_number,
      total,
      freight,
      appointment_date,
      created_at,
      payment_method,
      payment_status
    `)
    .eq("id", orderId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (orderErr) {
    throw new Error(`Erro ao buscar pedido: ${orderErr.message}`);
  }

  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  const { data: customer, error: customerErr } = await supabase
    .from("customers")
    .select(`
      id,
      company_id,
      name,
      fantasy_name,
      email,
      phone,
      state_registration,
      complement,
      neighborhood,
      number,
      type,
      document,
      zip_code,
      address,
      city,
      state,
      emit_nf
    `)
    .eq("id", order.customer_id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (customerErr) {
    throw new Error(`Erro ao buscar cliente: ${customerErr.message}`);
  }

  if (!customer) {
    throw new Error("Cliente não encontrado.");
  }

  if (customer.emit_nf !== true) {
    throw new Error(
      "O cliente não está habilitado para emitir NF-e. Revise as informações de cadastro.",
    );
  }

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select(`
      id,
      name,
      document,
      corporate_name,
      trade_name,
      zip_code,
      address,
      neighborhood,
      city,
      state,
      number,
      complement,
      phone,
      email,
      state_registration,
      cpf_emitente,
      regime_tributario
    `)
    .eq("id", companyId)
    .maybeSingle();

  if (companyErr) {
    throw new Error(`Erro ao buscar empresa: ${companyErr.message}`);
  }

  if (!company) {
    throw new Error("Empresa não encontrada.");
  }

  const companyState = normalizeState(company.state);
  const customerState = normalizeState(customer.state);

  if (!companyState) {
    throw new Error("A empresa não possui UF cadastrada.");
  }

  if (!customerState) {
    throw new Error("O cliente não possui UF cadastrada.");
  }

  const targetFiscalState =
    operationScope === "inside_state" ? companyState : customerState;

  const { data: fiscalOperation, error: fiscalErr } = await supabase
    .from("fiscal_operations")
    .select("*")
    .eq("company_id", companyId)
    .eq("state", targetFiscalState)
    .limit(1)
    .maybeSingle();

  if (fiscalErr) {
    throw new Error(`Erro ao buscar operação fiscal: ${fiscalErr.message}`);
  }

  if (!fiscalOperation) {
    throw new Error(
      `Operação fiscal não encontrada para a UF ${targetFiscalState}.`,
    );
  }

  const { data: orderItems, error: itemsErr } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      product_id,
      quantity,
      price,
      products (
        id,
        code,
        name,
        unit,
        description,
        ncm,
        cest,
        cfop,
        icms_origem,
        cst_icms,
        csosn_icms,
        icms_situacao_tributaria,
        pis,
        cofins,
        ipi
      )
    `)
    .eq("order_id", orderId);

  if (itemsErr) {
    throw new Error(`Erro ao buscar itens do pedido: ${itemsErr.message}`);
  }

  if (!orderItems || orderItems.length === 0) {
    throw new Error("Pedido sem itens para emissão.");
  }

  const companyAddress = getAddress(company);
  const customerAddress = getAddress(customer);
  const customerDoc = getDocumentInfo(customer);

  const freight = toNumber(order.freight);
  const items = orderItems.map((item: any, index: number) => {
    const product = item.products ?? null;

    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.price);
    const total = Number((quantity * unitPrice).toFixed(2));

    const productCfop =
      toText(product?.cfop) || toText(fiscalOperation.cfop);

    const icmsOrigem =
      toText(product?.icms_origem) || toText(fiscalOperation.icms_origem) || "0";

    const cstIcms =
      toText(product?.cst_icms) || toText(fiscalOperation.cst_icms);

    const csosnIcms =
      toText(product?.csosn_icms) || toText(fiscalOperation.csosn_icms);

    const icmsSituacaoTributaria =
      toText(product?.icms_situacao_tributaria) ||
      toText(fiscalOperation.icms_situacao_tributaria);

    const pis =
      toText(product?.pis) || toText(fiscalOperation.pis) || "04";

    const cofins =
      toText(product?.cofins) || toText(fiscalOperation.cofins) || "04";

    const ipi =
      toText(product?.ipi) || toText(fiscalOperation.ipi);

    const ncm =
      toText(product?.ncm) || toText(fiscalOperation.ncm);

    return {
      numero_item: index + 1,
      codigo_produto: toText(product?.code || product?.id || index + 1),
      descricao: toText(product?.name || product?.description || "Produto"),

      cfop: productCfop,
      unidade_comercial: toText(product?.unit, "UN"),
      quantidade_comercial: quantity,
      valor_unitario_comercial: unitPrice,
      valor_bruto: total,

      unidade_tributavel: toText(product?.unit, "UN"),
      quantidade_tributavel: quantity,
      valor_unitario_tributavel: unitPrice,

      codigo_ncm: ncm,
      cest: toText(product?.cest) || undefined,

      origem: icmsOrigem,
      icms_origem: icmsOrigem,

      cst_icms: cstIcms || undefined,
      csosn_icms: csosnIcms || undefined,
      icms_situacao_tributaria: icmsSituacaoTributaria || undefined,

      pis_situacao_tributaria: pis,
      cofins_situacao_tributaria: cofins,
      ipi_situacao_tributaria: ipi || undefined,
    };
  });

  const serie = "1";
  const noteNumber = toText(order.note_number);

  if (!noteNumber) {
    throw new Error("O pedido não possui note_number.");
  }

   const valorProdutos = Number(
    orderItems
      .reduce((acc: number, item: any) => {
        return acc + toNumber(item.quantity) * toNumber(item.price);
      }, 0)
      .toFixed(2),
  );

  const valorTotal = Number((valorProdutos + freight).toFixed(2));

  const invoiceData: Record<string, any> = {
    order_id: order.id,
    ref: buildRef(noteNumber, serie),
    note_number: noteNumber,
    numero: undefined,
    serie,

    ambiente: "2",
    data_emissao: order.appointment_date || order.created_at,
    data_entrada_saida: order.appointment_date || order.created_at,

    natureza_operacao: toText(
      fiscalOperation.natureza_operacao,
      operationScope === "inside_state"
        ? "Venda de Produto no Estado"
        : "Venda de Produto fora do Estado",
    ),

    tipo_documento: toIntEnum(fiscalOperation.tipo_documento, [0, 1], 1),

    local_destino: ["1", "2", "3"].includes(
      toText(
        fiscalOperation.local_destino,
        operationScope === "inside_state" ? "1" : "2",
      ),
    )
      ? toText(
          fiscalOperation.local_destino,
          operationScope === "inside_state" ? "1" : "2",
        )
      : operationScope === "inside_state"
        ? "1"
        : "2",

    finalidade_emissao: toIntEnum(
      fiscalOperation.finalidade_emissao,
      [1, 2, 3, 4],
      1,
    ),

    consumidor_final: ["0", "1"].includes(
      toText(fiscalOperation.consumidor_final, "1"),
    )
      ? toText(fiscalOperation.consumidor_final, "1")
      : "1",

    presenca_comprador: [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "9",
    ].includes(toText(fiscalOperation.presenca_comprador, "1"))
      ? toText(fiscalOperation.presenca_comprador, "1")
      : "1",

    modalidade_frete: toIntEnum(
      fiscalOperation.modalidade_frete,
      [0, 1, 2, 3, 4, 9],
      freight > 0 ? 0 : 9,
    ),

    valor_produtos: valorProdutos,
    valor_frete: freight,
    valor_seguro: 0,
    valor_total: valorTotal,

    nome_emitente: toText(company.corporate_name || company.name),
    nome_fantasia_emitente: toText(company.trade_name) || undefined,
    cnpj_emitente: onlyDigits(company.document),
    cpf_emitente: onlyDigits(company.cpf_emitente) || undefined,
    inscricao_estadual_emitente: toText(company.state_registration) || undefined,
    ie_emitente: toText(company.state_registration) || undefined,
    crt_emitente:
      company.regime_tributario !== null && company.regime_tributario !== undefined
        ? String(company.regime_tributario)
        : undefined,

    logradouro_emitente: companyAddress.address,
    endereco_emitente: companyAddress.address,
    numero_emitente: companyAddress.number,
    bairro_emitente: companyAddress.neighborhood,
    municipio_emitente: companyAddress.city,
    uf_emitente: companyAddress.state,
    cep_emitente: companyAddress.zip_code,
    complemento_emitente: companyAddress.complement || undefined,
    telefone_emitente: onlyDigits(company.phone) || undefined,
    email_emitente: toText(company.email) || undefined,

    nome_destinatario: toText(customer.name || order.customer),
    ...customerDoc,
    ie_destinatario: toText(customer.state_registration) || undefined,

    logradouro_destinatario: customerAddress.address,
    endereco_destinatario: customerAddress.address,
    numero_destinatario: customerAddress.number,
    bairro_destinatario: customerAddress.neighborhood,
    municipio_destinatario: customerAddress.city,
    uf_destinatario: customerAddress.state,
    cep_destinatario: customerAddress.zip_code,
    complemento_destinatario: customerAddress.complement || undefined,
    pais_destinatario: "Brasil",
    telefone_destinatario: onlyDigits(customer.phone || order.phone) || undefined,
    email_destinatario: toText(customer.email) || undefined,

    items,
  };

  return invoiceData;
}