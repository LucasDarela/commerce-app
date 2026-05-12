// lib/focus-nfe/invoiceSchema.ts
import { z } from "zod";

const itemSchema = z
  .object({
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
    codigo_cest: z.string().optional(),
    quantidade_tributavel: z.number(),
    valor_bruto: z.number(),

    icms_origem: z.enum(["0", "1", "2", "3", "4", "5", "6", "7", "8"]),

    icms_situacao_tributaria: z
      .string()
      .regex(/^\d{2,3}$/),  
    valor_bc_icms: z.number().optional(),
    aliquota_icms: z.number().optional(),
    valor_icms: z.number().optional(),

    pis_situacao_tributaria: z
      .string()
      .regex(/^\d{2}$/, "PIS deve ter 2 dígitos"),
    valor_bc_pis: z.number().optional(),
    aliquota_pis: z.number().optional(),
    valor_pis: z.union([z.number(), z.string()]).optional(),

    cofins_situacao_tributaria: z
      .string()
      .regex(/^\d{2}$/, "COFINS deve ter 2 dígitos"),
    valor_bc_cofins: z.number().optional(),
    aliquota_cofins: z.number().optional(),
    valor_cofins: z.union([z.number(), z.string()]).optional(),

    // ST – opcionais
    vbc_st_ret: z.number().optional(),
    pst: z.number().optional(),
    vicms_substituto: z.number().optional(),
    vicms_st_ret: z.number().optional(),

    // Reforma 2026 - Padrão Focus
    ibs_cbs_situacao_tributaria: z.string().optional(),
    ibs_cbs_classificacao_tributaria: z.string().optional(),
    ibs_uf_aliquota: z.union([z.number(), z.string()]).optional(),
    ibs_uf_valor: z.union([z.number(), z.string()]).optional(),
    cbs_aliquota: z.union([z.number(), z.string()]).optional(),
    cbs_valor: z.union([z.number(), z.string()]).optional(),

    // Reforma 2026 - Legados
    ibs_situacao_tributaria: z.string().optional(),
    aliquota_ibs: z.number().optional(),
    valor_bc_ibs: z.number().optional(),
    valor_ibs: z.union([z.number(), z.string()]).optional(),
    cbs_situacao_tributaria: z.string().optional(),
    aliquota_cbs: z.number().optional(),
    valor_bc_cbs: z.number().optional(),
    valor_cbs: z.union([z.number(), z.string()]).optional(),
  })
  .superRefine((it, ctx) => {

    // validação de ST somente para CST 60
    if (it.icms_situacao_tributaria === "60") {
      const falta =
        it.vbc_st_ret == null ||
        it.pst == null ||
        it.vicms_substituto == null ||
        it.vicms_st_ret == null;

      if (falta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Para ICMS 60 (ST) é obrigatório informar vbc_st_ret, pst, vicms_substituto e vicms_st_ret.",
          path: ["icms_situacao_tributaria"],
        });
      }
    }
  });

export const invoiceSchema = z
  .object({
    ref: z.string().optional(),
    ambiente: z.enum(["1", "2", "homologacao", "producao"]),
    order_id: z.string().uuid(),
    numero: z.union([z.number(), z.string()]).optional(),
    serie: z.string().optional(),
    id_dest: z.number().optional(),
    consumidor_final: z.number().optional(),
    indicador_inscricao_estadual_destinatario: z.number().optional(),
    natureza_operacao: z.string().min(1, "Obrigatório"),
    data_emissao: z.string(),
    data_entrada_saida: z.string(),
    tipo_documento: z.union([z.literal(0), z.literal(1)]),
    finalidade_emissao: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
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
    telefone_destinatario: z.string().optional(),
    cpf_destinatario: z.string().optional(),
    cnpj_destinatario: z.string().optional(),
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

    // Reforma 2026 Totais
    ibs_valor_total: z.number().optional(),
    cbs_valor_total: z.number().optional(),
    ibs_cbs_base_calculo: z.number().optional(),
    ibs_cbs_is_valor_total: z.number().optional(),

    items: z.array(itemSchema).min(1, "A nota precisa ter pelo menos 1 item"),
  })
  .superRefine((data, ctx) => {
    if (!data.cpf_destinatario && !data.cnpj_destinatario) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe cpf_destinatario ou cnpj_destinatario.",
        path: ["cpf_destinatario"],
      });
    }
  });
