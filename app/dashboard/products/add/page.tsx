"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { useRouter } from "next/navigation";

export default function AddProduct() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { companyId, loading: loadingCompany } = useAuthenticatedCompany()
  const [equipments, setEquipments] = useState<{ id: string; name: string }[]>([])
  const [product, setProduct] = useState({
    code: "",
    name: "",
    manufacturer: "",
    standard_price: "",
    percentage_taxes: "",
    material_class: "",
    submaterial_class: "",
    material_origin: "National",
    aplication: "",
    loan_product_code: "",
    ncm: "",
    cfop: "",
    csosn: "",
    unit: "",
    icms_rate: "",
    pis_rate: "",
    cofins_rate: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEquipments = async () => {
      const { data, error } = await supabase
        .from("equipments")
        .select("id, name")
        .eq("company_id", companyId)
  
      if (error) {
        console.error("Erro ao buscar equipamentos:", error)
        return
      }
  
      setEquipments(data || [])
    }
  
    if (companyId) fetchEquipments()
  }, [companyId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setProduct({ ...product, [name]: value });
  };

  const handleSubmit = async () => {
    if (!product.name || !product.standard_price || !product.material_class) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    if (!product.ncm || !product.cfop || !product.csosn || !product.unit) {
      toast.error("Preencha os dados fiscais obrigatórios (NCM, CFOP, CSOSN, Unidade).");
      return;
    }  
  
    setSubmitting(true)
  
    const { data: existingProduct, error: checkError } = await supabase
      .from("products")
      .select("code")
      .eq("code", product.code)
      .eq("company_id", companyId)
      .maybeSingle()
  
    if (checkError && checkError.code !== "PGRST116") {
      toast.error("Error checking product code!")
      setSubmitting(false)
      return
    }
  
    if (existingProduct) {
      toast.error("Código do produto já existe!")
      setSubmitting(false)
      return
    }
  
    const { data: createdProduct, error: insertError } = await supabase
    .from("products")
    .insert([
      {
        ...product,
        standard_price: parseFloat(product.standard_price),
        company_id: companyId,
        icms_rate: product.icms_rate ? parseFloat(product.icms_rate) : undefined,
        pis_rate: product.pis_rate ? parseFloat(product.pis_rate) : undefined,
        cofins_rate: product.cofins_rate ? parseFloat(product.cofins_rate) : undefined,  
      },
    ])
    .select("id")
    .single();
  
  if (insertError || !createdProduct) {
    toast.error("Erro ao criar produto!");
    setSubmitting(false);
    return;
  }
  
  if (product.loan_product_code) {
    await supabase.from("product_loans").insert([
      {
        product_id: createdProduct.id,
        equipment_id: product.loan_product_code,
        company_id: companyId,
      },
    ]);
  }
  
    toast.success("Product successfully added!")
    router.push("/dashboard/products")
    setSubmitting(false)
  }

  if (loadingCompany) {
    return <div className="p-6 text-center text-muted-foreground">Loading company data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Adicionar Produto</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input type="text" name="code" value={product.code} onChange={handleChange} placeholder="Código do Produto" required />
            <Input type="text" name="name" value={product.name} onChange={handleChange} placeholder="Nome do Produto" className="col-span-2" required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input type="text" name="standard_price" value={product.standard_price} onChange={handleChange} placeholder="Preço (R$)" required />
            <Input type="text" name="manufacturer" value={product.manufacturer} onChange={handleChange} placeholder="Fabricante" />
            <Select value={product.material_class} onValueChange={(value) => handleSelectChange("material_class", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Classe do Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHOPP">CHOPP</SelectItem>
                <SelectItem value="EQUIPAMENTO">EQUIPAMENTO</SelectItem>
                <SelectItem value="ACESSORIO">ACESSORIO</SelectItem>
              </SelectContent>
            </Select></div>

          <div className="grid grid-cols-3 gap-4">

            <Input type="text" name="submaterial_class" value={product.submaterial_class} onChange={handleChange} placeholder="Sub Classe" />
            <Select value={product.material_origin} onValueChange={(value) => handleSelectChange("material_origin", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Origem do Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="National">National</SelectItem>
                <SelectItem value="Imported">Importado</SelectItem>
              </SelectContent>
            </Select>
            <Input name="ncm" value={product.ncm || ""} onChange={handleChange} placeholder="NCM" />
          </div>

          <div className="grid grid-cols-3 gap-4">

            <Input name="cfop" value={product.cfop || ""} onChange={handleChange} placeholder="CFOP" />
            <Input name="csosn" value={product.csosn || ""} onChange={handleChange} placeholder="CSOSN" />
            <Input name="unit" value={product.unit || ""} onChange={handleChange} placeholder="Unidade (ex: L, CX, UN)" />
          </div>

          <div className="grid grid-cols-3 gap-4">

            <Input name="icms_rate" value={product.icms_rate || ""} onChange={handleChange} placeholder="ICMS (%)" />
            <Input name="pis_rate" value={product.pis_rate || ""} onChange={handleChange} placeholder="PIS (%)" />
            <Input name="cofins_rate" value={product.cofins_rate || ""} onChange={handleChange} placeholder="COFINS (%)" />
          </div>

          <Textarea name="aplication" value={product.aplication} onChange={handleChange} placeholder="Aplicação do Produto" />

          <Select
            value={product.loan_product_code}
            onValueChange={(value) => handleSelectChange("loan_product_code", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Produto Vinculado (Opcional)" />
            </SelectTrigger>
            <SelectContent>
              {equipments.map((eq) => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar Produto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}