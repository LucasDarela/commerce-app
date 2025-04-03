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

interface Fornecedor {
  id: string;
  name: string;
}

export default function ContasAPagar() {
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

  const registrarPagamento = async () => {
    if (!valor || !descricao || !formaPagamento) {
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
  
    const novaContaPagar = {
      descricao,
      valor,
      forma_pagamento: formaPagamento,
      pago: false, // Assumindo que a conta começa como "não paga"
      vencimento: vencimento ? vencimento : new Date().toISOString().split("T")[0],
      emissao: emissao ? emissao : new Date().toISOString().split("T")[0],
      categoria: categoriaSelecionada || categoriaPersonalizada || "outros",
      conta_id: contaSelecionada || null,
      created_at: new Date().toISOString(),
    };
  
    console.log("🔍 Enviando para Supabase:", novaContaPagar); // 🔹 Verificar o que está sendo enviado
  
    const { error } = await supabase.from("contas_a_pagar").insert([novaContaPagar]);
  
    if (error) {
      console.error("❌ Erro ao registrar conta a pagar:", error.message);
      toast.error("Erro ao registrar conta a pagar: " + error.message);
    } else {
      toast.success("Conta a pagar registrada com sucesso!");
      console.log("✅ Conta a pagar salva no banco de dados");
    }
  };

  useEffect(() => {
    const fetchFornecedores = async () => {
      const { data, error } = await supabase
        .from("fornecedores") // Certifique-se que o nome da tabela está correto
        .select("id, name");
  
      if (error) {
        console.error("❌ Erro ao buscar fornecedores:", error.message);
        toast.error("Erro ao carregar fornecedores.");
      } else {
        setFornecedores(data || []);
        console.log("✅ Fornecedores carregados:", data);
      }
    };
  
    fetchFornecedores();
  }, []);

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
      <h1 className="text-2xl font-bold mb-4">Registrar Conta a Pagar</h1>
      
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
      <div className="grid grid-cols-3 gap-4 items-end">
      <Input
        type="text"
        placeholder="Número da Nota (Opcional)"
        value={numeroNotaEntrada}
        onChange={(e) => setNumeroNotaEntrada(e.target.value)}
        className="mt-4"
      />
      <Input placeholder="Data de Emissao" value={emissao} onChange={(e) => setEmissao(e.target.value)} className="mt-4" />
      <Input placeholder="Data de Vencimento" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="mt-4" />
      </div>

      <div className="grid grid-cols-2 gap-4 items-end">
      {/* Categoria */}
      <Select value={categoriaSelecionada} onValueChange={setCategoriaSelecionada}>
        <SelectTrigger className="w-full mt-4">
          <SelectValue placeholder="Selecione uma categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="compra_produto">Compra de Produto</SelectItem>
          <SelectItem value="pagamento_funcionario">Pagamento Funcionário</SelectItem>
          <SelectItem value="vale_funcionario">Vale Funcionário</SelectItem>
          <SelectItem value="agua">Água</SelectItem>
          <SelectItem value="luz">Luz</SelectItem>
          <SelectItem value="aluguel">Aluguel</SelectItem>
          <SelectItem value="veiculo">Despesas Veículos</SelectItem>
          <SelectItem value="outros">+ Personalizar</SelectItem>
        </SelectContent>
      </Select>

{/* Fornecedor */}
      <Select value={fornecedorSelecionado} onValueChange={setFornecedorSelecionado}>
  <SelectTrigger className="w-full mt-4">
    <SelectValue placeholder="Selecione o Fornecedor" />
  </SelectTrigger>
  <SelectContent>
    {fornecedores.length > 0 ? (
      fornecedores
        .filter((fornecedor) => fornecedor.id) // Filtra fornecedores inválidos
        .map((fornecedor) => (
          <SelectItem key={fornecedor.id} value={fornecedor.id}>
            {fornecedor.name}
          </SelectItem>
        ))
    ) : (
      <SelectItem key="nenhum" value="nenhum" disabled>
        Nenhum fornecedor encontrado
      </SelectItem>
    )}
  </SelectContent>
</Select>
      </div>
      {categoriaSelecionada === "outros" && <Input placeholder="Informe a categoria personalizada" value={categoriaPersonalizada} onChange={(e) => setCategoriaPersonalizada(e.target.value)} className="mt-4" />}
            
 <div className="grid grid-cols-2 gap-4 items-end">     
      {/* Forma de Pagamento */}
      <Select value={formaPagamento} onValueChange={setFormaPagamento}>
        <SelectTrigger className="w-full mt-4">
          <SelectValue placeholder="Forma de Pagamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dinheiro">Dinheiro</SelectItem>
          <SelectItem value="pix">Pix</SelectItem>
          <SelectItem value="cartao">Cartão</SelectItem>
          <SelectItem value="boleto">Boleto</SelectItem>
        </SelectContent>
      </Select>
      {formaPagamento === "boleto" && <Input type="number" placeholder="Dias para pagamento" value={diasPagamento} onChange={(e) => setDiasPagamento(Number(e.target.value) || "")} className="mt-2" />}
      
      <Input type="number" placeholder="Valor" value={valor} onChange={(e) => setValor(Number(e.target.value) || "")} className="mt-4" />
      </div>
      <Input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-4" />

  {/* Checkbox para ativar a recorrência */}
  <div className="grid grid-cols-2 mt-4" >
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={recorrencia}
      onChange={() => setRecorrencia(!recorrencia)}
      className="w-5 h-5"
    />
    <span>Pagamento recorrente</span>
  </div>

  {/* Dropdown de recorrência (só aparece se recorrência estiver ativada) */}
  <div className="w-full">
  {recorrencia && (
    <Select
      value={tipoRecorrencia}
      onValueChange={setTipoRecorrencia}
      
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Escolha a frequência" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="semanal">Semanal</SelectItem>
        <SelectItem value="mensal">Mensal</SelectItem>
        <SelectItem value="anual">Anual</SelectItem>
      </SelectContent>
    </Select>
  )}
  </div>
</div>

      <textarea
            placeholder="Observações (Opcional)"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="mt-4 w-full h-32 p-2 border rounded-md resize-none"
          ></textarea>
      
      <Button className="mt-4 w-full" onClick={registrarPagamento} >Registrar Pagamento</Button>
      
      {/* Modal de Conta Bancária */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Conta Bancária</DialogTitle>
          </DialogHeader>
          <Input placeholder="Banco" value={novaConta.banco} onChange={(e) => setNovaConta({ ...novaConta, banco: e.target.value })} />
          <Input placeholder="Agência" value={novaConta.agencia} onChange={(e) => setNovaConta({ ...novaConta, agencia: e.target.value })} />
          <Input placeholder="Conta Corrente" value={novaConta.conta} onChange={(e) => setNovaConta({ ...novaConta, conta: e.target.value })} />
          <DialogFooter>
            <Button onClick={adicionarContaBancaria}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}