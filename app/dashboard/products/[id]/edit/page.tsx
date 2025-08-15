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
  unit: string;
  percentage_taxes?: string;
  description?: string;
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
    unit: "",
    percentage_taxes: "",
    description: "",
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

    const { error: updateError } = await supabase
      .from("products")
      .update({
        code: product.code,
        name: product.name,
        manufacturer: product.manufacturer,
        standard_price: parseFloat(product.standard_price) || 0,
        material_class: product.material_class,
        submaterial_class: product.submaterial_class || null,
        material_origin: product.material_origin,
        aplication: product.aplication || null,
        loan_product_code: product.loan_product_code || null,
        unit: product.unit,
        description: product.description || null,
        percentage_taxes: product.percentage_taxes
          ? parseFloat(product.percentage_taxes)
          : null,
      })
      .eq("id", productId);

    // antes de salvar, valide só os obrigatórios do produto
    if (!product.name || !product.standard_price || !product.material_class) {
      toast.error("Preencha os campos obrigatórios!");
      setLoading(false);
      return;
    }

    // só precisa de companyId se for vincular equipamento
    if (product.loan_product_code && !companyId) {
      toast.error("Empresa não encontrada para vincular equipamento.");
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
              value={product.code || ""}
              onChange={handleChange}
              placeholder="Código do Produto"
              required
            />
            <Input
              type="text"
              name="name"
              value={product.name || ""}
              onChange={handleChange}
              placeholder="Nome do Produto"
              className="col-span-2"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              type="text"
              name="standard_price"
              value={product.standard_price || ""}
              onChange={handleChange}
              placeholder="Custo (R$)"
              required
            />
            <Input
              type="text"
              name="manufacturer"
              value={product.manufacturer || ""}
              onChange={handleChange}
              placeholder="Fabricante"
            />

            <Select
              value={product.unit || ""}
              onValueChange={(value) => handleSelectChange("unit", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="un">Un - Unidade</SelectItem>
                <SelectItem value="kg">Kg - kilograma</SelectItem>
                <SelectItem value="m">M - Metro</SelectItem>
                <SelectItem value="l">L - Litro</SelectItem>
                <SelectItem value="m2">M2 - Metro quadrado</SelectItem>
                <SelectItem value="m3">M3 - Metro cubico</SelectItem>
                <SelectItem value="kw">Kw - Kilowatt</SelectItem>
                <SelectItem value="h">H - Hora</SelectItem>
                <SelectItem value="par">P - Par</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              value={product.material_class || ""}
              onValueChange={(value) =>
                handleSelectChange("material_class", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Classe do Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHOPP">CHOPP</SelectItem>
                <SelectItem value="EQUIPAMENTO">EQUIPAMENTO</SelectItem>
                <SelectItem value="ACESSORIO">ACESSORIO</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              name="submaterial_class"
              value={product.submaterial_class || ""}
              onChange={handleChange}
              placeholder="Sub Classe"
            />
            <Select
              value={product.material_origin || ""}
              onValueChange={(value) =>
                handleSelectChange("material_origin", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Origem do Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="National">Nacional</SelectItem>
                <SelectItem value="Foreign">Estrangeira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              name="percentage_taxes"
              value={product.percentage_taxes || ""}
              onChange={handleChange}
              placeholder="Tributos %"
            />
            <Select
              value={product.aplication || ""}
              onValueChange={(value) => handleSelectChange("aplication", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Aplicação do Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale-product">
                  Mercadoria para Revenda
                </SelectItem>
                <SelectItem value="materail-use-consumption">
                  Material de Uso e Consumo
                </SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
                <SelectItem value="fixed-asset">Ativo Imobilizado</SelectItem>
                <SelectItem value="raw-material">Matéria prima</SelectItem>
                <SelectItem value="sub-product">Subproduto</SelectItem>
                <SelectItem value="packaging">Embalagem</SelectItem>
                <SelectItem value="others">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            name="description"
            value={product.description || ""}
            onChange={handleChange}
            placeholder="Descrição do Produto"
          />

          <Select
            value={product.loan_product_code || ""}
            onValueChange={(value) =>
              handleSelectChange("loan_product_code", value)
            }
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

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Produto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
