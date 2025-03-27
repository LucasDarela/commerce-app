"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AddProduct() {
  const [produto, setProduto] = useState({
    codigo: "",
    nome: "",
    fabricante: "",
    preco: "",
    tributos: "",
    classeMaterial: "",
    subClasse: "",
    classificacaoFiscal: "",
    origem: "Nacional",
    aplicacao: "",
    codigoComodato: "",
  });

  const [imagem, setImagem] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresaId = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
  
      if (authError || !user) {
        console.error("❌ Erro ao buscar usuário autenticado:", authError?.message);
        toast.error("Erro ao carregar informações do usuário.");
        return;
      }
  
      const { data: usuario, error: usuarioError } = await supabase
        .from("user")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();
  
      if (usuarioError || !usuario) {
        console.error("❌ Erro ao buscar empresa do usuário:", usuarioError?.message);
        toast.error("Erro ao carregar dados da empresa.");
        return;
      }
  
      setEmpresaId(usuario.empresa_id);
    };
    fetchEmpresaId();
  }, []);

  // 🔹 Manipular inputs de texto
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProduto({ ...produto, [e.target.name]: e.target.value });
  };

  // 🔹 Manipular selects
  const handleSelectChange = (name: string, value: string) => {
    setProduto({ ...produto, [name]: value });
  };

  // 🔹 Manipular upload de imagem
  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const allowedTypes = ["image/png", "image/jpeg"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato inválido! Apenas PNG e JPG são permitidos.");
        return;
      }

      setImagem(file);

      // Gerar preview da imagem
      const reader = new FileReader();
      reader.onload = () => setImagemPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 🔹 Função para fazer upload da imagem para o Supabase Storage
  const uploadImagem = async () => {
    if (!imagem) return null;

    const fileExt = imagem.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `produtos/${fileName}`;

    const { data, error } = await supabase.storage.from("produtos").upload(filePath, imagem);

    if (error) {
      toast.error("Erro ao fazer upload da imagem!");
      return null;
    }

    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/produtos/${filePath}`;
  };

  // 🔹 Enviar dados para o Supabase
  const handleSubmit = async () => {
    if (!produto.nome || !produto.preco || !produto.classeMaterial || !produto.codigo || !empresaId) {
      toast.error("Preencha os campos obrigatórios!");
      setLoading(false);
      return;
    }

    // 🔹 Verificar se o código do produto já existe
    const { data: existingProduct, error: checkError } = await supabase
      .from("produtos")
      .select("codigo")
      .eq("codigo", produto.codigo)
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      toast.error("Erro ao verificar código do produto!");
      setLoading(false);
      return;
    }

    if (existingProduct) {
      toast.error("Código do produto já existe! Escolha um código único.");
      setLoading(false);
      return;
    }

    // 🔹 Fazer upload da imagem
    const imagemUrl = await uploadImagem();

    // 🔹 Inserir produto no Supabase
    const { error } = await supabase.from("produtos").insert([
      {
        codigo: produto.codigo,
        nome: produto.nome,
        fabricante: produto.fabricante || null,
        preco: parseFloat(produto.preco),
        tributos: produto.tributos ? parseFloat(produto.tributos) : null,
        classe_material: produto.classeMaterial,
        sub_classe: produto.subClasse || null,
        classificacao_fiscal: produto.classificacaoFiscal || null,
        origem: produto.origem,
        aplicacao: produto.aplicacao || null,
        codigo_comodato: produto.codigoComodato || null,
        imagem_url: imagemUrl || null,
        empresa_id: empresaId,
      },
    ]);

    if (error) {
      toast.error("Erro ao cadastrar produto!");
    } else {
      toast.success("Produto cadastrado com sucesso!");
      setProduto({
        codigo: "",
        nome: "",
        fabricante: "",
        preco: "",
        tributos: "",
        classeMaterial: "",
        subClasse: "",
        classificacaoFiscal: "",
        origem: "Nacional",
        aplicacao: "",
        codigoComodato: "",
      });
      setImagem(null);
      setImagemPreview(null);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Cadastrar Produto</h1>

      {/* 🔹 Área de Upload de Imagem */}
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

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* 🔹 Nome e Código do Produto */}
          <div className="grid grid-cols-3 gap-4">
          <Input type="text" name="codigo" value={produto.codigo} onChange={handleChange} placeholder="Código do Produto" required />
            <Input type="text" name="nome" value={produto.nome} onChange={handleChange} placeholder="Nome do Produto" className="col-span-2" required />

          </div>

          {/* 🔹 Linha com 3 Campos: Preço | Fabricante | Tributos */}
          <div className="grid grid-cols-3 gap-4">
            <Input type="text" name="preco" value={produto.preco} onChange={handleChange} placeholder="Preço Padrão (R$)" required />
            <Input type="text" name="fabricante" value={produto.fabricante} onChange={handleChange} placeholder="Fabricante" />
            <Input type="text" name="tributos" value={produto.tributos} onChange={handleChange} placeholder="Tributos (%)" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select onValueChange={(value) => handleSelectChange("classeMaterial", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Classe do Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chopp">Chopp</SelectItem>
                <SelectItem value="Equipamento">Equipamento</SelectItem>
                <SelectItem value="Acessório">Acessório</SelectItem>
              </SelectContent>
            </Select>
            <Input type="text" name="subClasse" value={produto.subClasse} onChange={handleChange} placeholder="Subclasse do Material" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="text" name="classificacaoFiscal" value={produto.classificacaoFiscal} onChange={handleChange} placeholder="Classificação Fiscal" />
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

          <Textarea name="aplicacao" value={produto.aplicacao} onChange={handleChange} placeholder="Aplicação do Produto" />

          <Input type="text" name="codigoComodato" value={produto.codigoComodato} onChange={handleChange} placeholder="Código do Produto Vinculado em Comodato (Opcional)" />

          <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Produto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}