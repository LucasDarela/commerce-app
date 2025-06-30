// lib/focus-nfe/invoiceSchema.ts
import { z } from "zod";

export const invoiceSchema = z.object({
  ref: z.string(),
  ambiente: z.enum(["1", "2"]),
  order_id: z.string().uuid(),
  natureza_operacao: z.string().min(1, "Obrigatório"),
  data_emissao: z.string(), // formato YYYY-MM-DD
  data_entrada_saida: z.string(),
  tipo_documento: z.union([z.literal(0), z.literal(1)]), // 0 ou 1
  finalidade_emissao: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),

  cnpj_emitente: z.string(),
  cpf_emitente: z.string().optional(),
  nome_emitente: z.string(),
  nome_fantasia_emitente: z.string(),
  logradouro_emitente: z.string(),
  numero_emitente: z.string(),
  bairro_emitente: z.string(),
  municipio_emitente: z.string(),
  uf_emitente: z.string(),
  cep_emitente: z.string(),
  inscricao_estadual_emitente: z.string(),

  nome_destinatario: z.string(),
  cpf_destinatario: z.string(),
  inscricao_estadual_destinatario: z.string().nullable().optional(),
  logradouro_destinatario: z.string(),
  numero_destinatario: z.string(),
  bairro_destinatario: z.string(),
  municipio_destinatario: z.string(),
  uf_destinatario: z.string(),
  pais_destinatario: z.string(),
  cep_destinatario: z.string(),

  presenca_comprador: z.enum(["0", "1", "2", "3", "4", "9"]),

  valor_frete: z.number(),
  valor_seguro: z.number(),
  valor_total: z.number(),
  valor_produtos: z.number(),
  modalidade_frete: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(9),
  ]),

  items: z.array(
    z.object({
      numero_item: z.number(),
      codigo_produto: z.string(),
      descricao: z.string(),
      cfop: z.string().length(4),
      unidade_comercial: z.string(),
      quantidade_comercial: z.number(),
      valor_unitario_comercial: z.number(),
      valor_unitario_tributavel: z.number(),
      unidade_tributavel: z.string(),
      codigo_ncm: z.string().length(8),
      quantidade_tributavel: z.number(),
      valor_bruto: z.number(),
      icms_situacao_tributaria: z.string(),
      icms_origem: z.string(),
      pis_situacao_tributaria: z.union([
        z.literal(1),
        z.literal(4),
        z.literal(6),
        z.literal(7),
        z.literal(8),
        z.literal(99),
      ]),
      cofins_situacao_tributaria: z.number().int().min(1).max(99),
      // ipi_situacao_tributaria: z.string().optional(),
    }),
  ),
});
