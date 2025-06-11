// lib/focus-nfe/invoiceSchema.ts
import { z } from "zod"

export const invoiceSchema = z.object({
  ambiente: z.enum(["1", "2"]),

  cliente: z.object({
    nome: z.string(),
    cpf_cnpj: z.string(),
    ie: z.string().optional(),
    endereco: z.object({
      logradouro: z.string(),
      numero: z.string(),
      bairro: z.string(),
      municipio: z.string(),
      uf: z.string(),
      cep: z.string(),
    }),
  }),

  produtos: z.array(z.object({
    nome: z.string(),
    codigo: z.string(),
    cfop: z.string(),
    cst: z.string(),
    unidade: z.string(),
    quantidade: z.number(),
    valor_unitario: z.number(),
    valor_total: z.number(),
    pis: z.string(),
    cofins: z.string(),
    ipi: z.string(),
  })),

  emissor: z.object({
    razao_social: z.string(),
    nome_fantasia: z.string(),
    cnpj: z.string(),
    ie: z.string(),
    endereco: z.object({
      logradouro: z.string(),
      numero: z.string(),
      bairro: z.string(),
      municipio: z.string(),
      uf: z.string(),
      cep: z.string(),
    }),
  }),

  natureza_operacao: z.string(),
  finalidade_emissao: z.enum(["1", "2", "3", "4"]),
  modelo: z.enum(["55"]),

  pagamentos: z.array(z.object({
    forma_pagamento: z.enum(["01", "02", "03", "04", "05", "10", "11", "12", "13", "14", "15", "16", "17", "90", "99"]),
    valor: z.number(),
  })),
})