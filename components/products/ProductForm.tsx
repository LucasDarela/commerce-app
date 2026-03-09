"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
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
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

type ProductFormData = {
  code: string;
  name: string;
  manufacturer: string;
  standard_price: string;
  percentage_taxes: string;
  material_class: string;
  submaterial_class: string;
  material_origin: string;
  aplication: string;
  loan_product_code: string;
  unit: string;
  description: string;
  ncm: string;
  cest: string;
  cfop: string;
  icms_origem: string;
  cst_icms: string;
  csosn_icms: string;
  icms_situacao_tributaria: string;
  pis: string;
  cofins: string;
  ipi: string;
};

const defaultProductFormData: ProductFormData = {
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
  ncm: "",
  cest: "",
  cfop: "",
  icms_origem: "",
  cst_icms: "",
  csosn_icms: "",
  icms_situacao_tributaria: "",
  pis: "",
  cofins: "",
  ipi: "",
};

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialData?: Partial<ProductFormData>;
};

export function ProductForm({
  mode,
  productId,
  initialData,
}: ProductFormProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { companyId, loading: loadingCompany } = useAuthenticatedCompany();

  const [equipments, setEquipments] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [formData, setFormData] = useState<ProductFormData>({
    ...defaultProductFormData,
    ...initialData,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultProductFormData,
        ...initialData,
      });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchEquipments = async () => {
      if (!companyId) return;

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

    fetchEquipments();
  }, [companyId, supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!formData.name || !formData.standard_price || !formData.material_class) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "create") {
        const { data: existingProduct, error: checkError } = await supabase
          .from("products")
          .select("code")
          .eq("code", Number(formData.code))
          .eq("company_id", companyId)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          throw new Error("Erro ao validar código do produto.");
        }

        if (existingProduct) {
          throw new Error("Código do produto já existe.");
        }
      }

      const payload = { 
        code: Number(formData.code || 0),
        name: formData.name,
        manufacturer: formData.manufacturer || null,
        standard_price: Number(formData.standard_price.replace(",", ".")),
        percentage_taxes: formData.percentage_taxes || null,
        material_class: formData.material_class || null,
        submaterial_class: formData.submaterial_class || null,
        material_origin: formData.material_origin || null,
        aplication: formData.aplication || null,
        unit: formData.unit || null,
        description: formData.description || null,
        ncm: formData.ncm || null,
        cest: formData.cest || null,
        cfop: formData.cfop || null,
        icms_origem: formData.icms_origem || null,
        cst_icms: formData.cst_icms || null,
        csosn_icms: formData.csosn_icms || null,
        icms_situacao_tributaria: formData.icms_situacao_tributaria || null,
        pis: formData.pis || null,
        cofins: formData.cofins || null,
        ipi: formData.ipi || null,
        company_id: companyId,
      };

      let savedProductId = productId;

      if (mode === "create") {
        const { data: createdProduct, error } = await supabase
          .from("products")
          .insert([payload])
          .select("id")
          .single();

        if (error || !createdProduct) {
          throw new Error("Erro ao criar produto.");
        }

        savedProductId = createdProduct.id;
      } else {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", productId)
          .eq("company_id", companyId);

        if (error) {
          throw new Error("Erro ao atualizar produto.");
        }
      }

      if (savedProductId) {
        await supabase
          .from("product_loans")
          .delete()
          .eq("product_id", savedProductId)
          .eq("company_id", companyId);

        if (formData.loan_product_code) {
          await supabase.from("product_loans").insert([
            {
              product_id: savedProductId,
              equipment_id: formData.loan_product_code,
              company_id: companyId,
            },
          ]);
        }
      }

      toast.success(
        mode === "create"
          ? "Produto adicionado com sucesso!"
          : "Produto atualizado com sucesso!",
      );

      router.push("/dashboard/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar produto.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading company data...
      </div>
    );
  }

return (
  <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-6 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "create" ? "Adicionar Produto" : "Editar Produto"}
          </h1>
        </div>

        {/* DADOS GERAIS */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Dados do Produto</h2>
            <p className="text-sm text-muted-foreground">
              Informações principais do produto.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="standard_price">Preço (R$)</Label>
              <Input
                id="standard_price"
                type="text"
                name="standard_price"
                value={formData.standard_price}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturer">Fabricante</Label>
              <Input
                id="manufacturer"
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => handleSelectChange("unit", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Un - Unidade</SelectItem>
                  <SelectItem value="kg">Kg - Kilograma</SelectItem>
                  <SelectItem value="m">M - Metro</SelectItem>
                  <SelectItem value="l">L - Litro</SelectItem>
                  <SelectItem value="m2">M2 - Metro quadrado</SelectItem>
                  <SelectItem value="m3">M3 - Metro cúbico</SelectItem>
                  <SelectItem value="kw">Kw - Kilowatt</SelectItem>
                  <SelectItem value="h">H - Hora</SelectItem>
                  <SelectItem value="par">P - Par</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Classe do Material</Label>
              <Select
                value={formData.material_class}
                onValueChange={(value) =>
                  handleSelectChange("material_class", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHOPP">CHOPP</SelectItem>
                  <SelectItem value="EQUIPAMENTO">EQUIPAMENTO</SelectItem>
                  <SelectItem value="ACESSORIO">ACESSÓRIO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submaterial_class">Sub Classe</Label>
              <Input
                id="submaterial_class"
                type="text"
                name="submaterial_class"
                value={formData.submaterial_class}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label>Origem do Produto</Label>
              <Select
                value={formData.material_origin}
                onValueChange={(value) =>
                  handleSelectChange("material_origin", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="National">Nacional</SelectItem>
                  <SelectItem value="Foreign">Estrangeira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="percentage_taxes">Tributos (%)</Label>
              <Input
                id="percentage_taxes"
                name="percentage_taxes"
                value={formData.percentage_taxes}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Aplicação do Material</Label>
              <Select
                value={formData.aplication}
                onValueChange={(value) =>
                  handleSelectChange("aplication", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
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
          </div>
        </div>

        {/* DADOS FISCAIS */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Dados Fiscais</h2>
            <p className="text-sm text-muted-foreground">
              Informações utilizadas para emissão de nota fiscal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ncm">NCM</Label>
              <Input
                id="ncm"
                name="ncm"
                value={formData.ncm}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cest">CEST</Label>
              <Input
                id="cest"
                name="cest"
                value={formData.cest}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfop">CFOP</Label>
              <Input
                id="cfop"
                name="cfop"
                value={formData.cfop}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icms_origem">Origem ICMS</Label>
              <Input
                id="icms_origem"
                name="icms_origem"
                value={formData.icms_origem}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cst_icms">CST ICMS</Label>
              <Input
                id="cst_icms"
                name="cst_icms"
                value={formData.cst_icms}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="csosn_icms">CSOSN</Label>
              <Input
                id="csosn_icms"
                name="csosn_icms"
                value={formData.csosn_icms}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icms_situacao_tributaria">
                Situação Tributária ICMS
              </Label>
              <Input
                id="icms_situacao_tributaria"
                name="icms_situacao_tributaria"
                value={formData.icms_situacao_tributaria}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pis">PIS</Label>
              <Input
                id="pis"
                name="pis"
                value={formData.pis}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cofins">COFINS</Label>
              <Input
                id="cofins"
                name="cofins"
                value={formData.cofins}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipi">IPI</Label>
              <Input
                id="ipi"
                name="ipi"
                value={formData.ipi}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* DESCRIÇÃO E VÍNCULO */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="min-h-[110px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Equipamento Vinculado</Label>
            <Select
              value={formData.loan_product_code}
              onValueChange={(value) =>
                handleSelectChange("loan_product_code", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um equipamento" />
              </SelectTrigger>
              <SelectContent>
                {equipments.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            className="w-full md:w-auto min-w-[180px]"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar Produto"
                : "Atualizar Produto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);
}