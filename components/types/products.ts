// components/types/products.ts

export type ProductItem = {
  id: string;
  name: string;
  quantity: number;
};

export type Product = {
  id: string;
  company_id: string;
  code: number;
  name: string;
  standard_price?: number | null;
  manufacturer?: string | null;
  material_class?: string | null;
  submaterial_class?: string | null;
  material_origin?: string | null;
  aplication?: string | null;
  loan_product_code?: string | null;
  created_at?: string | null;
  stock?: number | null;
  percentage_taxes?: string | null;
  unit?: string | null;
  description?: string | null;

  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  icms_origem?: string | null;
  cst_icms?: string | null;
  csosn_icms?: string | null;
  icms_situacao_tributaria?: string | null;
  pis?: string | null;
  cofins?: string | null;
  ipi?: string | null;
};
