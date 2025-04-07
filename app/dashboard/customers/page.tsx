"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Pencil, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

type Cliente = {
  id: number;
  name: string;
  type: string;
  document: string;
  phone: string;
  zip_code: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  email: string;
  state_registration?: string;
  fantasy_name?: string;
};

export default function ListCustomers() {
  const router = useRouter();
  const { user, companyId, loading } = useAuthenticatedCompany();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!companyId || loading) return;
  
    const fetchCustomers = async () => {
      try {
        const { data: clientes, error: clientesError } = await supabase
          .from("customers")
          .select("*")
          .eq("company_id", companyId)
          .order("name", { ascending: true });
  
        if (clientesError) {
          console.error("Erro ao buscar clientes:", clientesError.message);
          toast.error("Erro ao carregar clientes.");
          return;
        }
  
        setClientes(clientes || []);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar clientes:", error);
        toast.error("Erro inesperado ao carregar clientes.");
      }
    };
  
    if (typeof window !== "undefined") {
      fetchCustomers();
    }
  }, [companyId, loading]);

  // 🔹 Normaliza texto (remove acentos e converte para minúsculas)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // 🔹 Filtrar clientes diretamente no momento da renderização
  const filteredClientes = clientes.filter((cliente) => {
    const searchTerm = normalizeText(search);
    const nomeCliente = normalizeText(cliente.name || "");
    const cpfCnpj = cliente.document ? cliente.document.replace(/\D/g, "") : "";
    const telefone = cliente.phone ? cliente.phone.replace(/\D/g, "") : "";
  
    return (
      nomeCliente.includes(searchTerm) ||
      cpfCnpj.includes(search.replace(/\D/g, "")) ||
      telefone.includes(search.replace(/\D/g, ""))
    );
  });

  const openModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  // 🔹 Fecha o modal
  const closeModal = () => {
    setSelectedCliente(null);
    setIsModalOpen(false);
  };

  const handleEdit = () => {
    if (selectedCliente) {
      router.push(`/dashboard/customers/${selectedCliente.id}/edit`);
      closeModal();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) {
        toast.error("Erro ao excluir cliente: " + error.message);
      } else {
        toast.success("Cliente excluído com sucesso!");
        setClientes(clientes.filter((cliente) => cliente.id !== id));
      }
    }
  };

  return (
  <div className="p-8">
      {/* 🔹 Campo de Pesquisa */}
      <div className="mb-4 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Pesquise por Nome, CPF ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 p-2 border rounded-md"
        />
                <Button size="sm" onClick={() => router.push("/dashboard/customers/add")} className="w-full sm:w-auto">
          Adicionar Cliente
        </Button>
      </div>

      {/* 🔹 Tabela de Clientes Responsiva */}
      <div className="p-6 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Documento</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="hidden md:table-cell">Cidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.length > 0 ? (
              filteredClientes.map((cliente) => (
            <TableRow
              key={cliente.id}
              onClick={() => {
                openModal(cliente);
              }}
              className="cursor-pointer hover:bg-gray-100 h-[50px]"
            >
                  <TableCell>{cliente.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{cliente.type}</TableCell>
                  <TableCell className="hidden md:table-cell">{cliente.document}</TableCell>
                  <TableCell className="hidden md:table-cell">{cliente.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">{cliente.city}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhum cliente encontrado...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 🔹 Modal de Detalhes do Cliente */}
      {isModalOpen && selectedCliente && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-lg w-full" aria-describedby="cliente-modal-description">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
            </DialogHeader>
            {/* 🔹 Descrição acessível */}
            <p id="cliente-modal-description" className="sr-only">
              Informações detalhadas do cliente selecionado.
            </p>
            <div className="space-y-2">
              <p><strong>Nome:</strong> {selectedCliente.name}</p>
              {selectedCliente.fantasy_name && <p><strong>Nome Fantasia:</strong> {selectedCliente.fantasy_name}</p>}
              <p><strong>Tipo:</strong> {selectedCliente.type}</p>
              <p><strong>Documento:</strong> {selectedCliente.document}</p>
              <p><strong>Telefone:</strong> {selectedCliente.phone}</p>
              <p><strong>CEP:</strong> {selectedCliente.zip_code}</p>
              <p><strong>Endereço:</strong> {[
                selectedCliente.address,
                selectedCliente.neighborhood,
                selectedCliente.number
              ].filter(Boolean).join(", ")}</p>
              {selectedCliente.complement && <p><strong>Complemento:</strong> {selectedCliente.complement}</p>}
              {selectedCliente.complement && <p><strong>Complemento:</strong> {selectedCliente.complement}</p>}
              <p><strong>Cidade:</strong> {selectedCliente.city}</p>
              <p><strong>Estado:</strong> {selectedCliente.state}</p>
              <p><strong>Email:</strong> {selectedCliente.email || ""}</p>
              {selectedCliente.state_registration && <p><strong>Inscrição Estadual:</strong> {selectedCliente.state_registration}</p>}
            </div>
            <DialogFooter className="flex justify-between">
              <Button onClick={handleEdit}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(selectedCliente.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}