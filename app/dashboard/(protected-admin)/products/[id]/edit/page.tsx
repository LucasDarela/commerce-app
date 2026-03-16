"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ProductForm } from "@/components/products/ProductForm";

export default function EditProductPage() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProduct({
          code: data.code?.toString() ?? "",
          name: data.name ?? "",
          manufacturer: data.manufacturer ?? "",
          standard_price: data.standard_price?.toString() ?? "",
          percentage_taxes: data.percentage_taxes ?? "",
          material_class: data.material_class ?? "",
          submaterial_class: data.submaterial_class ?? "",
          material_origin: data.material_origin ?? "National",
          aplication: data.aplication ?? "",
          loan_product_code: data.loan_product_code ?? "",
          unit: data.unit ?? "",
          description: data.description ?? "",
          ncm: data.ncm ?? "",
          cest: data.cest ?? "",
          cfop: data.cfop ?? "",
          icms_origem: data.icms_origem ?? "",
          cst_icms: data.cst_icms ?? "",
          csosn_icms: data.csosn_icms ?? "",
          icms_situacao_tributaria: data.icms_situacao_tributaria ?? "",
          pis: data.pis ?? "",
          cofins: data.cofins ?? "",
          ipi: data.ipi ?? "",
        });
      }

      setLoading(false);
    }

    fetchProduct();
  }, [id, supabase]);

  if (loading) {
    return <div className="p-6">Carregando produto...</div>;
  }

  return <ProductForm mode="edit" productId={id} initialData={product} />;
}