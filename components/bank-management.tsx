"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// 🔹 Definição dos tipos de dados
interface ContaBancaria {
  id: string;
  nome: string;
  agencia: string;
  conta: string;
}


export default function BankManagement() {
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [novaConta, setNovaConta] = useState({ banco: "", agencia: "", conta: "" });

  const [contaSelecionada, setContaSelecionada] = useState<string>("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("");
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState<string>("");
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string>("");
  const [formaPagamento, setFormaPagamento] = useState<string>("pix");
  const [diasPagamento, setDiasPagamento] = useState<number | "">("");
  const [valor, setValor] = useState<number | "">("");
  const [descricao, setDescricao] = useState<string>("");
  const [vencimento, setVencimento] = useState<string>("");
  const [emissao, setEmissao] = useState<string>("");
  const [recorrencia, setRecorrencia] = useState<boolean>(false);
  const [observacoes, setObservacoes] = useState<string>("");
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState("");
  const [numeroNotaEntrada, setNumeroNotaEntrada] = useState(""); 
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

  useEffect(() => {
    const fetchContas = async () => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("id, nome, agencia, conta"); // 🔹 Alterado para garantir que `nome` está sendo buscado corretamente
  
      if (error) {
        toast.error("Erro ao buscar contas bancárias.");
        console.error("Erro ao buscar contas bancárias:", error.message);
      } else {
        setContasBancarias(Array.isArray(data) ? data : []);
        console.log("✅ Contas bancárias carregadas:", data); // 🔹 Debug para conferir a resposta do Supabase
      }
    };
  
    fetchContas();
  }, []);

  const adicionarContaBancaria = async () => {
  if (!novaConta.banco || !novaConta.agencia || !novaConta.conta || !empresaId) {
    toast.error("Preencha todos os campos corretamente.");
    return;
  }

  console.log("Enviando para Supabase:", {
    nome: novaConta.banco, // Certifique-se de que está enviando a chave correta
    agencia: novaConta.agencia,
    conta: novaConta.conta,
    empresa_id: empresaId, // 🔹 Garante que o banco está vinculado à empresa correta
  });

  const { error } = await supabase.from("contas_bancarias").insert([
    {
      nome: novaConta.banco, // 🔹 Ajuste para garantir que está enviando para a coluna correta
      agencia: novaConta.agencia,
      conta: novaConta.conta,
      empresa_id: empresaId,
    },
  ]);

  if (error) {
    console.error("❌ Erro ao cadastrar conta bancária:", error.message);
    toast.error("Erro ao cadastrar conta bancária: " + error.message);
  } else {
    toast.success("Conta bancária cadastrada com sucesso!");
    setModalAberto(false);
    setNovaConta({ banco: "", agencia: "", conta: "" }); // Limpa os campos após cadastro
  }
};

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Registrar Conta Bancaria</h2>
      
      {/* Conta Bancária */}
            <div className="grid grid-cols-2 gap-4 items-end">
            <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a conta bancária" />
            </SelectTrigger>
            <SelectContent>
              {contasBancarias.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.nome} - {conta.agencia}/{conta.conta} {/* 🔹 Agora `nome` é reconhecido corretamente */}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        <Button onClick={() => setModalAberto(true)} className="col-span-1">
          Adicionar Banco
        </Button>
      </div>
      </div>

  );
}