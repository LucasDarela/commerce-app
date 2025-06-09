import { z } from "zod"

export const invoiceSchema = z.object({
  natureza_operacao: z.string().min(1),
  modelo: z.literal("55"), // NF-e
  finalidade_emissao: z.union([
    z.literal("1"), // Normal
    z.literal("2"), // Complementar
    z.literal("3"), // Ajuste
    z.literal("4"), // Devolução
  ]),
  ambiente: z.union([z.literal("1"), z.literal("2")]), // 1 = produção, 2 = homologação
  cliente: z.object({
    nome: z.string(),
    cpf_cnpj: z.string(),
    endereco: z.string(),
    numero: z.string(),
    bairro: z.string(),
    municipio: z.string(),
    uf: z.string().length(2),
    cep: z.string().min(8),
  }),
  produtos: z.array(
    z.object({
      descricao: z.string(),
      codigo: z.string(),
      ncm: z.string(),
      cfop: z.string(),
      unidade: z.string(),
      quantidade: z.number().positive(),
      valor_unitario: z.number().positive(),
      icms_situacao_tributaria: z.string(), // ex: "102"
    })
  ).min(1),
  pagamentos: z.array(
    z.object({
      forma_pagamento: z.string(), // 01 = dinheiro, 02 = cheque, 03 = cartão crédito, etc
      valor_pagamento: z.number().positive(),
    })
  ),
  emissor: z.object({
    cnpj: z.string().min(14),
    inscricao_estadual: z.string().optional(),
    nome_fantasia: z.string().optional(),
    razao_social: z.string(),
    regime_tributario: z.enum(["1", "2", "3"]),
    endereco: z.string(),
    numero: z.string(),
    bairro: z.string(),
    municipio: z.string(),
    uf: z.string().length(2),
    cep: z.string().min(8),
  }),
  transporte: z.object({
    modalidade_frete: z.enum(["0", "1", "2", "9"]),
  }).optional(),
  informacoes_adicionais: z.string().optional(),
})

export type InvoiceData = z.infer<typeof invoiceSchema>