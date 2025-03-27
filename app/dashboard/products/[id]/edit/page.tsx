"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

// 🔹 Tipo Produto para tipagem correta
type Produto = {
  id: number;
  codigo: string;
  nome: string;
  fabricante: string;
  preco: string;
  tributos: string;
  classe_material: string;
  sub_classe: string;
  classificacao_fiscal: string;
  origem: string;
  aplicacao: string;
  codigo_comodato?: string;
  estoque: number;
  imagem_url?: string;
};

export default function EditProduct() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [produto, setProduto] = useState<Produto>({
    id: 0,
    codigo: "",
    nome: "",
    fabricante: "",
    preco: "0",
    tributos: "",
    classe_material: "Chopp",
    sub_classe: "",
    classificacao_fiscal: "",
    origem: "Nacional",
    aplicacao: "",
    codigo_comodato: "",
    estoque: 0,
    imagem_url: "",
  });

  const [imagem, setImagem] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);

  // 🔹 Buscar dados do produto
  useEffect(() => {
    const fetchProduto = async () => {
      const { data, error } = await supabase.from("produtos").select("*").eq("id", id).single();
      if (error) {
        toast.error("Erro ao carregar produto!");
      } else {
        setProduto(data);
        if (data.imagem_url) setImagemPreview(data.imagem_url);
      }
    };
    if (id) fetchProduto();
  }, [id]);

  // 🔹 Manipula mudanças nos inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProduto({ ...produto, [e.target.name]: e.target.value });
  };

  // 🔹 Manipula mudanças nos selects
  const handleSelectChange = (name: keyof Produto, value: string) => {
    setProduto((prevProduto) => ({
      ...prevProduto,
      [name]: value,
    }));
  };

  // 🔹 Manipula upload de imagem
  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagem(file);
      const reader = new FileReader();
      reader.onload = () => setImagemPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 🔹 Atualiza o produto no Supabase
  const handleSubmit = async () => {
    setLoading(true);
    if (!produto.nome || !produto.preco || !produto.classe_material) {
      toast.error("Preencha os campos obrigatórios!");
      setLoading(false);
      return;
    }

    let imagemUrl = produto.imagem_url ?? "";
    if (imagem) {
      const fileExt = imagem.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `produtos/${fileName}`;
      const { data, error } = await supabase.storage.from("produtos").upload(filePath, imagem);
      if (error) {
        toast.error("Erro ao fazer upload da imagem!");
      } else {
        imagemUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/produtos/${filePath}`;
      }
    }

    const { error } = await supabase.from("produtos").update({
      codigo: produto.codigo,
      nome: produto.nome,
      fabricante: produto.fabricante,
      preco: parseFloat(produto.preco),
      tributos: produto.tributos ? parseFloat(produto.tributos) : null,
      classe_material: produto.classe_material,
      sub_classe: produto.sub_classe || null,
      classificacao_fiscal: produto.classificacao_fiscal || null,
      origem: produto.origem,
      aplicacao: produto.aplicacao || null,
      codigo_comodato: produto.codigo_comodato || null,
      imagem_url: imagemUrl,
    }).eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar produto!");
    } else {
      toast.success("Produto atualizado com sucesso!");
      router.push("/dashboard/produtos");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Produto</h1>
      
      {/* 🔹 Upload da Imagem */}
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col items-center">
          <label htmlFor="imagemUpload" className="cursor-pointer">
            {imagemPreview ? (
              <img src={imagemPreview} alt="Preview" className="h-40 object-cover rounded-lg shadow-md" />
            ) : (
              <div className="h-40 w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <span className="text-gray-500">Clique para adicionar uma imagem</span>
              </div>
            )}
          </label>
          <input type="file" id="imagemUpload" accept="image/png, image/jpeg" className="hidden" onChange={handleImagemChange} />
        </CardContent>
      </Card>

      {/* 🔹 Formulário de Edição */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Código e Nome */}
          <div className="grid grid-cols-3 gap-4">
            <Input type="text" name="codigo" value={produto.codigo} onChange={handleChange} placeholder="Código do Produto" required />
            <Input type="text" name="nome" value={produto.nome} onChange={handleChange} placeholder="Nome do Produto" className="col-span-2" required />
          </div>

          {/* Preço, Fabricante e Tributos */}
          <div className="grid grid-cols-3 gap-4">
            <Input type="text" name="preco" value={produto.preco} onChange={handleChange} placeholder="Preço Padrão (R$)" required />
            <Input type="text" name="fabricante" value={produto.fabricante} onChange={handleChange} placeholder="Fabricante" />
            <Input type="text" name="tributos" value={produto.tributos} onChange={handleChange} placeholder="Tributos (%)" />
          </div>

          {/* 🔹 Nova seção adicionada abaixo de "Tributos" */}
          <div className="grid grid-cols-2 gap-4">
            <Select onValueChange={(value) => handleSelectChange("classe_material", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Classe do Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chopp">Chopp</SelectItem>
                <SelectItem value="Equipamento">Equipamento</SelectItem>
                <SelectItem value="Acessório">Acessório</SelectItem>
              </SelectContent>
            </Select>
            <Input type="text" name="sub_classe" value={produto.sub_classe} onChange={handleChange} placeholder="Subclasse do Material" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="text" name="classificacao_fiscal" value={produto.classificacao_fiscal} onChange={handleChange} placeholder="Classificação Fiscal" />
            <Select onValueChange={(value) => handleSelectChange("origem", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Origem do Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nacional">Nacional</SelectItem>
                <SelectItem value="Importado">Importado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aplicação do Produto */}
          <Textarea name="aplicacao" value={produto.aplicacao} onChange={handleChange} placeholder="Aplicação do Produto" />
          <Input type="text" name="codigo_comodato" value={produto.codigo_comodato ?? ""} onChange={handleChange} placeholder="Código do Produto Vinculado" />


          {/* Botão de Salvar */}
          <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Produto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}