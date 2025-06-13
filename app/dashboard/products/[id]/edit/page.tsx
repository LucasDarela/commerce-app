"use client";

import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

type Product = {
  id: number;
  code: string;
  name: string;
  manufacturer: string;
  standard_price: string;
  material_class: string;
  submaterial_class: string;
  material_origin: string;
  aplication: string;
  loan_product_code?: string;
  stock: number;
  ncm: string;
  cfop: string;
  csosn: string;
  unit: string;
  icms_rate: string;
  pis_rate: string;
  cofins_rate: string;
};

type Equipment = {
  id: string;
  name: string;
};

export default function EditProduct() {
  const router = useRouter();
  const { companyId, loading: loadingCompany } = useAuthenticatedCompany();
  const { id } = useParams();
  const productId = Array.isArray(id) ? id[0] : id;
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product>({
    id: 0,
    code: "",
    name: "",
    manufacturer: "",
    standard_price: "0",
    material_class: "Chopp",
    submaterial_class: "",
    material_origin: "Nacional",
    aplication: "",
    loan_product_code: "",
    stock: 0,
    ncm: "",
    cfop: "",
    csosn: "",
    unit: "",
    icms_rate: "",
    pis_rate: "",
    cofins_rate: "",
  });

  const [equipments, setEquipments] = useState<Equipment[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (error) {
        toast.error("Erro ao carregar produto!");
      } else {
        setProduct(data);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchEquipments = async () => {
      const { data, error } = await supabase
        .from("equipments")
        .select("id, name");
      if (!error && data) setEquipments(data);
    };
    fetchEquipments();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: keyof Product, value: string) => {
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (loadingCompany) {
      toast.warning("Carregando dados da empresa...");
      setLoading(false);
      return;
    }
    if (!product.name || !product.standard_price || !product.material_class) {
      toast.error("Preencha os campos obrigatórios!");
      setLoading(false);
      return;
    }

    if (!product.ncm || !product.cfop || !product.csosn || !product.unit) {
      toast.error(
        "Preencha os dados fiscais obrigatórios (NCM, CFOP, CSOSN, Unidade).",
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({
        code: product.code,
        name: product.name,
        manufacturer: product.manufacturer,
        standard_price: parseFloat(product.standard_price),
        material_class: product.material_class,
        submaterial_class: product.submaterial_class || null,
        material_origin: product.material_origin,
        aplication: product.aplication || null,
        loan_product_code: product.loan_product_code || null,
        cfop: product.cfop,
        csosn: product.csosn,
        unit: product.unit,
        icms_rate: product.icms_rate ? parseFloat(product.icms_rate) : null,
        pis_rate: product.pis_rate ? parseFloat(product.pis_rate) : null,
        cofins_rate: product.cofins_rate
          ? parseFloat(product.cofins_rate)
          : null,
      })
      .eq("id", productId);

    if (!companyId || !product.loan_product_code) {
      console.error("❌ Dados faltando:", {
        companyId,
        loan_product_code: product.loan_product_code,
      });
      toast.error("Erro: empresa ou equipamento não encontrado.");
      setLoading(false);
      return;
    }

    if (product.loan_product_code) {
      const { data: existingLoan, error: loanError } = await supabase
        .from("product_loans")
        .select("*")
        .eq("product_id", String(productId))
        .maybeSingle(); // evita erro 406

      if (loanError) {
        console.error("❌ Erro ao buscar product_loans:", loanError.message);
      }

      if (existingLoan) {
        await supabase
          .from("product_loans")
          .update({ equipment_id: product.loan_product_code })
          .eq("id", existingLoan.id);
      } else {
        const { error: insertLoanError } = await supabase
          .from("product_loans")
          .insert([
            {
              product_id: String(productId),
              equipment_id: String(product.loan_product_code),
              company_id: String(companyId),
              quantity: 1,
            },
          ]);
        if (insertLoanError) {
          toast.error("Erro ao vincular equipamento");
          console.error(insertLoanError);
          setLoading(false);
          return;
        }
      }
    }

    toast.success("Produto atualizado com sucesso!");
    router.push("/dashboard/products");
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Produto</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              type="text"
              name="code"
              value={product.code ?? ""}
              onChange={handleChange}
              placeholder="Product Code"
              required
            />
            <Input
              type="text"
              name="name"
              value={product.name ?? ""}
              onChange={handleChange}
              placeholder="Product Name"
              className="col-span-2"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              type="text"
              name="standard_price"
              value={product.standard_price ?? ""}
              onChange={handleChange}
              placeholder="Standard Price (R$)"
              required
            />
            <Input
              type="text"
              name="manufacturer"
              value={product.manufacturer ?? ""}
              onChange={handleChange}
              placeholder="Manufacturer"
            />
            {/* <Input type="text" name="percentage_taxes" value={product.percentage_taxes ?? ""} onChange={handleChange} placeholder="Taxes (%)" /> */}
            <Select
              value={product.material_class}
              onValueChange={(value) =>
                handleSelectChange("material_class", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Classe do Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chopp">Chopp</SelectItem>
                <SelectItem value="Equipamento">Equipamento</SelectItem>
                <SelectItem value="Acessório">Acessório</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              type="text"
              name="submaterial_class"
              value={product.submaterial_class ?? ""}
              onChange={handleChange}
              placeholder="Submaterial Class"
            />
            <Select
              value={product.material_origin}
              onValueChange={(value) =>
                handleSelectChange("material_origin", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Material Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nacional">Nacional</SelectItem>
                <SelectItem value="Importado">Importado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              name="ncm"
              value={product.ncm}
              onChange={handleChange}
              placeholder="NCM"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              name="cfop"
              value={product.cfop}
              onChange={handleChange}
              placeholder="CFOP"
            />
            <Input
              name="csosn"
              value={product.csosn}
              onChange={handleChange}
              placeholder="CSOSN"
            />
            <Input
              name="unit"
              value={product.unit}
              onChange={handleChange}
              placeholder="Unidade (ex: UN, CX, L)"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              name="icms_rate"
              value={product.icms_rate}
              onChange={handleChange}
              placeholder="ICMS (%)"
            />
            <Input
              name="pis_rate"
              value={product.pis_rate}
              onChange={handleChange}
              placeholder="PIS (%)"
            />
            <Input
              name="cofins_rate"
              value={product.cofins_rate}
              onChange={handleChange}
              placeholder="COFINS (%)"
            />
          </div>

          <Textarea
            name="aplication"
            value={product.aplication ?? ""}
            onChange={handleChange}
            placeholder="Product Application"
          />

          <Select
            value={product.loan_product_code ?? ""}
            onValueChange={(value) =>
              handleSelectChange("loan_product_code", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Produto Vinculado (Comodato)" />
            </SelectTrigger>
            <SelectContent>
              {equipments.map((eq) => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSubmit}
            disabled={loading || loadingCompany}
            className="w-full"
          >
            {loading || loadingCompany ? "Salvando..." : "Salvar Produto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
