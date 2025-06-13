import { supabase } from "@/lib/supabase";
import { Order } from "@/components/types/order";
import { Database } from "@/components/types/supabase";

export async function buildInvoiceData(order: Order, companyId: string) {
  const client =
    supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

  // 1. Buscar dados da empresa
  const { data: company, error: companyError } = await client
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (!company || companyError) throw new Error("Empresa não encontrada");

  // 2. Buscar cliente
  const { data: customer, error: customerError } = await client
    .from("customers")
    .select("*")
    .eq("name", order.customer)
    .single();

  if (!customer || customerError) throw new Error("Cliente não encontrado");

  // 3. Converter produtos para array estruturado
  const parsed = order.products
    ?.split(",")
    .map((entry) => {
      const match = entry.trim().match(/^(.+?) \((\d+)x\)$/);
      if (!match) return null;
      const [, name, qty] = match;
      return { name: name.trim(), quantity: parseInt(qty) };
    })
    .filter((p): p is { name: string; quantity: number } => p !== null);

  if (!parsed || parsed.length === 0) throw new Error("Produtos inválidos");

  const productNames = parsed.map((p) => p.name);
  const { data: productsDb } = await client
    .from("products")
    .select("name, code, ncm, unit, standard_price")
    .in("name", productNames);

  const products = parsed.map((p) => {
    const db = productsDb?.find((prod) => prod.name === p.name);
    if (!db || !db.ncm || !db.unit) {
      throw new Error(`Produto '${p.name}' está sem NCM ou unidade definida.`);
    }
    return {
      numero_item: 1, // pode ser incrementado se necessário
      codigo_produto: db.code ?? p.name,
      descricao: p.name,
      ncm: db.ncm,
      cfop: "5102", // CFOP padrão para venda dentro do estado
      unidade_comercial: db.unit,
      quantidade_comercial: p.quantity,
      valor_unitario_comercial: db.standard_price,
      valor_bruto: db.standard_price * p.quantity,
      unidade_tributavel: db.unit,
      quantidade_tributavel: p.quantity,
      valor_unitario_tributavel: db.standard_price,
      icms_origem: "0",
      icms_cst: "102",
      pis_cst: "07",
      cofins_cst: "07",
    };
  });

  const invoiceData = {
    natureza_operacao: "Venda de mercadoria",
    modelo: "55",
    finalizacao: "1",
    ambiente: "2", // homologação
    cliente: {
      cpf_cnpj: customer.document,
      nome_razao_social: customer.name,
      endereco_logradouro: customer.address,
      endereco_numero: customer.number,
      endereco_bairro: customer.neighborhood,
      endereco_municipio: customer.city,
      endereco_uf: customer.state,
      endereco_cep: customer.zip_code,
      telefone: customer.phone,
      email: customer.email,
      indicador_ie: "9", // não contribuinte
    },
    products,
    pagamentos: [
      {
        forma_pagamento: order.payment_method === "Boleto" ? "15" : "01", // 01 = Dinheiro, 15 = Boleto
        valor_pagamento: order.total,
      },
    ],
    emissor: {
      cnpj: company.document,
      nome_razao_social: company.corporate_name,
    },
  };

  return invoiceData;
}
