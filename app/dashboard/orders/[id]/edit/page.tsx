"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { Trash, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Cliente {
  id: number;
  name: string;
  document: string;
  phone: string;
  address: string;
  cep: string;
  bairro: string;
  city: string;
  state: string;
  numero: string;
}

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface Venda {
  id: number;
  cliente_id: number;
  numeroNota: string;
  tipoDocumento: string;
  formaPagamento: string;
  condicaoPagamento: string;
  diasBoleto: string;
  frete: number;
  produtos: Produto[];
  agendamento: {
    data: string;
    horario: string;
    localEntrega: string;
  };
}

export default function EditOrder() {
  const router = useRouter();
  const { id } = useParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchCliente, setSearchCliente] = useState("");
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [frete, setFrete] = useState<number>(0);
  const [produtosSelecionados, setProdutosSelecionados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [preco, setPreco] = useState<number>(0);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [venda, setVenda] = useState({
    cliente_id: "",
    numeroNota: "",
    tipoDocumento: "interna",
    condicaoPagamento: "dinheiro",
    formaPagamento: "dinheiro", // 🔹 Certifique-se de que esta linha está presente!
    diasBoleto: "12",
    agendamento: {
      data: "",
      horario: "",
      localEntrega: "",
    },
  });
  
  // **Carregar Venda**
  useEffect(() => {
    const fetchVenda = async () => {
      if (!id) return;
      const { data, error } = await supabase.from("vendas").select("*").eq("id", id).single();
      if (error) {
        toast.error("Erro ao carregar venda.");
        return;
      }
      setVenda(data);
    };
    fetchVenda();
  }, [id]);

  // **Carregar Clientes**
  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) {
        toast.error("Erro ao carregar clientes.");
        return;
      }
      setClientes(data);
    };
    fetchClientes();
  }, []);

  // **Carregar Produtos**
  useEffect(() => {
    const fetchProdutos = async () => {
      const { data, error } = await supabase.from("produtos").select("*");
      if (error) {
        toast.error("Erro ao carregar produtos.");
        return;
      }
      setProdutos(data);
    };
    fetchProdutos();
  }, []);

  // **Filtrar Clientes**
  const clientesFiltrados = searchCliente
    ? clientes.filter((c) =>
        c.name.toLowerCase().includes(searchCliente.toLowerCase()) ||
        c.document.includes(searchCliente)
      )
    : [];

  // **Selecionar Cliente**
  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setVenda({ ...venda, cliente_id: String(cliente.id) });
    setSearchCliente(cliente.name);
    setMostrarClientes(false); // Esconder a lista após selecionar
  };

  const adicionarProduto = () => {
    if (produtoSelecionado) {
      setProdutosSelecionados([
        ...produtosSelecionados,
        { ...produtoSelecionado, quantidade, preco },
      ]);
      setProdutoSelecionado(null);
      setQuantidade(1);
      setPreco(0);
    }
  };

  const [agendamento, setAgendamento] = useState({
    data: undefined as Date | undefined,
    horario: "",
    localEntrega: "",
  });

  const calcularTotal = () => {
    const totalProdutos = produtosSelecionados.reduce(
      (acc, item) => acc + item.preco * item.quantidade,
      0
    );
    return totalProdutos + frete;
  };
  const removerProduto = (index: number) => {
    setProdutosSelecionados(produtosSelecionados.filter((_, i) => i !== index));
  };
        // 🔹 Garantindo que agendamento está preenchido corretamente
        const agendamentoData = {
          data: agendamento.data ? format(agendamento.data, "yyyy-MM-dd") : null,
          horario: agendamento.horario || null,
          localEntrega: agendamento.localEntrega || null,
        };


  const editarVenda = {
    cliente_id: venda.cliente_id,
    cliente: clienteSelecionado?.name || "",
    numero_documento: clienteSelecionado?.document || "",
    tipo_documento: venda.tipoDocumento,
    numero_nota: venda.numeroNota || "",
    forma_pagamento: venda.formaPagamento,
    condicao_pagamento: venda.condicaoPagamento,
    dias_boleto: venda.formaPagamento === "boleto" ? parseInt(venda.diasBoleto) : null,
    total: calcularTotal(),
    frete: frete || 0,
    pago: false,
    status_entrega: "Pendente",
    agendamento: agendamentoData, // 🔹 Garantindo que os dados de agendamento estão indo corretamente
    produtos: produtosSelecionados.map((p) => ({
      id: p.id,
      nome: p.nome,
      quantidade: p.quantidade,
      preco: p.preco,
    })),
  };

  console.log("Enviando venda para Supabase:", editarVenda); // 🔍 Depuração

  // **Atualizar Venda**
  const handleUpdate = async () => {
    if (!venda) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("vendas").update(venda).eq("id", id);
      if (error) throw error;
      toast.success("Venda atualizada com sucesso!");
      router.push("/dashboard/vendas");
    } catch (error) {
      toast.error("Erro ao atualizar venda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">

      <div className="grid grid-cols-3 gap-4">
      <h1 className="text-2xl font-bold mb-4">Editar Venda</h1>
          <Input type="text" placeholder="Número da Nota" value={venda?.numeroNota} onChange={(e) => setVenda({ ...venda!, numeroNota: e.target.value })} />
            <Select onValueChange={(value) => setVenda({ ...venda, tipoDocumento: value })}>
              <SelectTrigger className="bg-white border border-gray-300 rounded-md shadow-sm">
                <SelectValue placeholder="Tipo de Nota" />
              </SelectTrigger>
              <SelectContent className="shadow-md rounded-md">
                <SelectItem value="interna">Interna</SelectItem>
                <SelectItem value="fiscal">Fiscal</SelectItem>
              </SelectContent>
            </Select>
          </div>

      {/* Selecionar Cliente */}
      <Card className="mb-6">
        <CardContent className=" space-y-4">
          <h2 className="text-xl font-bold mb-4">Selecione o Cliente</h2>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-4 relative">
              <Input
                type="text"
                placeholder="Buscar Cliente..."
                value={searchCliente}
                onChange={(e) => {
                  setSearchCliente(e.target.value);
                  setMostrarClientes(true);
                }}
              />
              {mostrarClientes && clientesFiltrados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-md max-h-40 overflow-y-auto">
                  {clientesFiltrados.map((cliente) => (
                    <div key={cliente.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectCliente(cliente)}>
                      {cliente.name} - {cliente.document}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link href="/dashboard/clientes/cadastrar">
              <Button variant="default" className="w-full">Cadastrar</Button>
            </Link>
          </div>

          {/* Campos Fixos do Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <Input value={clienteSelecionado ?.document ?? ""} readOnly placeholder="Documento" />
            <Input value={clienteSelecionado ?.phone ?? ""} readOnly placeholder="Telefone" />
            <Input value={clienteSelecionado ?.address ?? ""} readOnly placeholder="Endereço" />
            <Input value={clienteSelecionado ?.cep ?? ""} readOnly placeholder="CEP" />
            <Input value={clienteSelecionado ?.bairro ?? ""} readOnly placeholder="Bairro" />
            <Input value={clienteSelecionado ?.city ?? ""} readOnly placeholder="Cidade" />
            <Input value={clienteSelecionado ?.state ?? ""} readOnly placeholder="Estado" />
            <Input value={clienteSelecionado ?.numero ?? ""} readOnly placeholder="Número" />
          </div>
        </CardContent>
      </Card>

            {/* Card de Produtos */}
            <Card className="mb-6">
        <CardContent className="space-y-4">
        <h2 className="text-xl font-bold mb-4">Selecione os Produtos</h2>
        <div className="grid grid-cols-4 gap-4 items-center">
        <Select onValueChange={(value) => {
          const produto = produtos.find(prod => prod.id.toString() === value);
          if (produto) {
            setProdutoSelecionado(produto);
            setPreco(produto.preco);
          }
        }}>
          <SelectTrigger className="bg-white border border-gray-300 rounded-md shadow-sm w-full">
            <SelectValue placeholder="Selecionar Produto" />
          </SelectTrigger>
          <SelectContent className="bg-white shadow-md rounded-md z-50">
            {produtos.map((produto) => (
              <SelectItem key={produto.id} value={produto.id.toString()} className="hover:bg-gray-100 cursor-pointer">
                {produto.codigo} - {produto.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="text" placeholder="Quantidade" value={quantidade === 0 ? "" : quantidade} onChange={(e) => setQuantidade(Number(e.target.value) || 0)} />
        <Input type="text" placeholder="Preço" value={preco === 0 ? "" : preco} onChange={(e) => setPreco(Number(e.target.value) || 0)} />
        <Button onClick={adicionarProduto} className="cursor-pointer">Adicionar</Button>
      </div>

      <div className="grid grid-cols-4 gap-4 items-center">

            {/* 🔹 Forma de Pagamento */}
            <Select
        value={venda.formaPagamento} 
        onValueChange={(value) => {
          setVenda((prev) => ({
            ...prev,
            formaPagamento: value,
            diasBoleto: value === "boleto" ? "12" : value === "cartao" ? "1" : prev.diasBoleto, 
          }));
        }}
      >
        <SelectTrigger className="w-full bg-white border border-gray-300 rounded-md shadow-sm">
          <SelectValue placeholder="Forma de Pagamento" />
        </SelectTrigger>
        <SelectContent className="w-full shadow-md rounded-md">
          <SelectItem value="pix">Pix</SelectItem>
          <SelectItem value="dinheiro">Dinheiro</SelectItem>
          <SelectItem value="cartao">Cartão</SelectItem>
          <SelectItem value="boleto">Boleto</SelectItem>
        </SelectContent>
      </Select>

      {/* 🔹 Prazo de Dias (Sempre visível, mas editável apenas para "cartão" e "boleto") */}
      <Input
        type="number"
        placeholder="Prazo de Dias"
        value={venda.diasBoleto}
        onChange={(e) => setVenda((prev) => ({ ...prev, diasBoleto: e.target.value }))}
        disabled={["pix", "dinheiro"].includes(venda.formaPagamento)} 
        className={`w-full bg-white border border-gray-300 rounded-md shadow-sm 
          ${["pix", "dinheiro"].includes(venda.formaPagamento) ? "cursor-not-allowed bg-gray-100 text-gray-500" : ""}`}
      />
            </div>

 {/* 🔹 Tabela de Produtos Adicionados */}
 <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtosSelecionados.map((produto, index) => (
            <TableRow key={index}>
              <TableCell>{produto.nome}</TableCell>
              <TableCell>{produto.quantidade}</TableCell>
              <TableCell>R$ {produto.preco.toFixed(2)}</TableCell>
              <TableCell>
                <Trash className="cursor-pointer text-red-500" onClick={() => removerProduto(index)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

           {/* 🔹 Campos de Agendamento */}
           <div className="mt-20">
        <h2 className="text-xl font-bold mb-4">Agendamento</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* 🔹 Escolher Data */}
          <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full flex justify-between cursor-pointer hover:bg-gray-100">
                  {agendamento.data ? format(agendamento.data, "dd/MM/yyyy") : "Escolher Data"}
                  <CalendarIcon className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] bg-white shadow-lg rounded-md p-2 z-50 border border-gray-200" align="center" side="bottom">
              <DatePicker
              selected={agendamento.data}
              onChange={(date: Date | null) => setAgendamento((prev) => ({ ...prev, data: date || undefined }))}
              dateFormat="dd/MM/yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"
            />
              </PopoverContent>
            </Popover>

          {/* 🔹 Escolher Horário */}
          <Input
            type="time"
            placeholder="Horário"
            value={agendamento.horario}
            onChange={(e) => setAgendamento({ ...agendamento, horario: e.target.value })}
          />

          {/* 🔹 Local de Entrega */}
          <Input
            type="text"
            placeholder="Local de Entrega"
            value={agendamento.localEntrega}
            onChange={(e) => setAgendamento({ ...agendamento, localEntrega: e.target.value })}
          />
        </div>
          </div>

        {/* Frete + Total da Venda e Botao de Editar */}
        <div className="grid grid-cols-3 gap-4 items-center">
            <Input 
                type="text" 
                placeholder="Frete" 
                value={frete === 0 ? "" : frete} // Se for 0, deixa vazio
                onChange={(e) => setFrete(Number(e.target.value) || 0)} 
              />
            <div className="font-bold">Total da Venda: R$ {calcularTotal().toFixed(2)}</div>

            {/* Botão de Atualizar */}
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Salvando..." : "Editar Venda"}
            </Button>
        </div>
        </CardContent>
        </Card>
   </div>
  );
}