"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Pencil, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

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
  price_table_id?: string;
  emit_nf?: boolean;
};

export default function ListCustomers() {
  const router = useRouter();
  const { user, companyId, loading } = useAuthenticatedCompany();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [catalogName, setCatalogName] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!companyId || loading) return;

    const fetchCustomers = async () => {
      try {
        let query = supabase
          .from("customers")
          .select("*")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (search.trim()) {
          const normalizedSearch = search.trim().toLowerCase();
          const numericSearch = search.replace(/\D/g, "");

          const filters = [`name.ilike.%${normalizedSearch}%`];
          if (numericSearch) {
            filters.push(`document.ilike.%${numericSearch}%`);
            filters.push(`phone.ilike.%${numericSearch}%`);
          }

          query = query.or(filters.join(","));
        }

        const { data: clientes, error } = await query;

        if (error) {
          console.error("Erro ao buscar clientes:", error.message);
          toast.error("Erro ao carregar clientes.");
          return;
        }

        setClientes(clientes || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("❌ Erro inesperado ao buscar clientes:", err);
        toast.error("Erro inesperado ao carregar clientes.");
      }
    };

    fetchCustomers();
  }, [companyId, loading, search]);

  // 🔹 Normaliza texto (remove acentos e converte para minúsculas)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD") // remove acentos
      .replace(/[\u0300-\u036f]/g, "") // remove caracteres especiais
      .replace(/\s+/g, " ") // substitui múltiplos espaços por um único espaço
      .replace(/\n/g, "") // remove quebras de linha
      .trim(); // remove espaços no começo e fim
  };

  const paginatedClientes = clientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalPages = Math.ceil(clientes.length / itemsPerPage);

  const openModal = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);

    // Buscar o nome do catálogo
    if (cliente.price_table_id) {
      const { data, error } = await supabase
        .from("price_tables")
        .select("name")
        .eq("id", cliente.price_table_id)
        .single();

      if (error) {
        console.error("Erro ao buscar catálogo:", error.message);
        setCatalogName(null);
      } else {
        setCatalogName(data?.name || null);
      }
    } else {
      setCatalogName(null);
    }
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
        closeModal();
      }
    }
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="p-6 mt-3">
      <h2 className="text-xl font-bold mb-4">Clientes</h2>
      <div className="mb-6 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Pesquise por Nome, CPF ou telefone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full h-8 p-2 border rounded-md"
        />
        <Link href="/dashboard/customers/add">
          <Button
            variant="default"
            size="sm"
            className="min-w-[100px] w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="mr-1" />
            <span className="hidden sm:inline">Cliente</span>
          </Button>
        </Link>
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
            {clientes.length > 0 ? (
              paginatedClientes.map((cliente) => (
                <TableRow
                  key={cliente.id}
                  onClick={() => {
                    openModal(cliente);
                  }}
                  className="cursor-pointer h-[50px]"
                >
                  <TableCell>{cliente.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {cliente.type}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {cliente.document}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {cliente.phone}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {cliente.city}
                  </TableCell>
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

      {/* Paginação */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm">
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <IconChevronsLeft />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            <IconChevronsRight />
          </Button>
        </div>
      </div>

      {/* 🔹 Modal de Detalhes do Cliente */}
      {isModalOpen && selectedCliente && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent
            className="max-w-lg w-full"
            aria-describedby="cliente-modal-description"
          >
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
            </DialogHeader>
            {/* 🔹 Descrição acessível */}
            <p id="cliente-modal-description" className="sr-only">
              Informações detalhadas do cliente selecionado.
            </p>
            <div className="space-y-2">
              <p>
                <strong>Nome:</strong> {selectedCliente.name}
              </p>
              {selectedCliente.fantasy_name && (
                <p>
                  <strong>Nome Fantasia:</strong> {selectedCliente.fantasy_name}
                </p>
              )}
              <p>
                <strong>Tipo:</strong> {selectedCliente.type}
              </p>
              <p>
                <strong>Documento:</strong> {selectedCliente.document}
              </p>
              <p>
                <strong>Telefone:</strong> {selectedCliente.phone}
              </p>
              <p>
                <strong>CEP:</strong> {selectedCliente.zip_code}
              </p>
              <p>
                <strong>Endereço:</strong>{" "}
                {[
                  selectedCliente.address,
                  selectedCliente.neighborhood,
                  selectedCliente.number,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {selectedCliente.complement && (
                <p>
                  <strong>Complemento:</strong> {selectedCliente.complement}
                </p>
              )}
              <p>
                <strong>Cidade:</strong> {selectedCliente.city}
              </p>
              <p>
                <strong>Estado:</strong> {selectedCliente.state}
              </p>
              <p>
                <strong>Email:</strong> {selectedCliente.email || ""}
              </p>
              {selectedCliente.state_registration && (
                <p>
                  <strong>Inscrição Estadual:</strong>{" "}
                  {selectedCliente.state_registration}
                </p>
              )}
              {catalogName && (
                <p>
                  <strong>Catálogo de Preço:</strong> {catalogName}
                </p>
              )}
              <p>
                <strong>Emite NFe:</strong>{" "}
                {selectedCliente.emit_nf === true ? "Sim" : "Não"}
              </p>
            </div>
            <DialogFooter className="w-full">
              <div className="grid grid-cols-4 gap-4 w-full">
                <Button onClick={handleEdit} className="col-span-3">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedCliente.id)}
                  className="col-span-1"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
