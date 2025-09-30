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
  const { companyId, loading: loadingCompany } = useAuthenticatedCompany();
  const [equipments, setEquipments] = useState<{ id: string; name: string }[]>(
    [],
  );
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
    unit: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEquipments = async () => {
      const { data, error } = await supabase
        .from("equipments")
        .select("id, name")
        .eq("company_id", companyId);

      if (error) {
        console.error("Erro ao buscar equipamentos:", error);
        return;
      }

      setEquipments(data || []);
    };

    if (companyId) fetchEquipments();
  }, [companyId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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

    setSubmitting(true);

    const { data: existingProduct, error: checkError } = await supabase
      .from("products")
      .select("code")
      .eq("code", product.code)
      .eq("company_id", companyId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      toast.error("Error checking product code!");
      setSubmitting(false);
      return;
    }

    if (existingProduct) {
      toast.error("Código do produto já existe!");
      setSubmitting(false);
      return;
    }

    const { data: createdProduct, error: insertError } = await supabase
      .from("products")
      .insert([
        {
          ...product,
          standard_price: parseFloat(product.standard_price.replace(",", ".")),
          company_id: companyId,
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

    toast.success("🍻 Produto adicionado com sucesso!");
    router.push("/dashboard/products");
    setSubmitting(false);
  };

  if (loadingCompany) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading company data...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Adicionar Produto</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              type="text"
              name="code"
              value={product.code}
              onChange={handleChange}
              placeholder="Código do Produto"
              required
            />
            <Input
              type="text"
              name="name"
              value={product.name}
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
              value={product.standard_price}
              onChange={handleChange}
              placeholder="Custo (R$)"
              required
            />
            <Input
              type="text"
              name="manufacturer"
              value={product.manufacturer}
              onChange={handleChange}
              placeholder="Fabricante"
            />

            <Select
              value={product.unit}
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
              value={product.material_class}
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
              value={product.submaterial_class}
              onChange={handleChange}
              placeholder="Sub Classe"
            />
            <Select
              value={product.material_origin}
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
              value={product.aplication}
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
            value={product.description}
            onChange={handleChange}
            placeholder="Descrição do Produto"
          />

          <Select
            value={product.loan_product_code}
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

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Salvando..." : "Salvar Produto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
