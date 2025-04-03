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

// 🔹 Tipo Nota
interface Nota {
  id: number;
  data: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor: number;
}

export default function Financeiro() {
  const router = useRouter();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedNota, setSelectedNota] = useState<Nota | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔹 Buscar notas do Supabase
  useEffect(() => {
    const fetchNotas = async () => {
      const { data, error } = await supabase
        .from("contas_a_pagar")
        .select("*")
        .order("data", { ascending: false });

      if (error) {
        console.error("Erro ao buscar notas:", error.message);
      } else {
        setNotas(data || []);
      }
    };

    fetchNotas();
  }, []);

  // 🔹 Filtrar notas conforme pesquisa
  const notasFiltradas = notas.filter((nota) => {
    const searchTerm = search.toLowerCase();
    return (
      nota.descricao.toLowerCase().includes(searchTerm) ||
      nota.fornecedor.toLowerCase().includes(searchTerm) ||
      nota.categoria.toLowerCase().includes(searchTerm)
    );
  });

  // 🔹 Abre o modal com detalhes da nota
  const openModal = (nota: Nota) => {
    setSelectedNota(nota);
    setIsModalOpen(true);
  };

  // 🔹 Fecha o modal
  const closeModal = () => {
    setSelectedNota(null);
    setIsModalOpen(false);
  };

  // 🔹 Exclui uma nota
  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta nota?")) {
      const { error } = await supabase.from("contas_a_pagar").delete().eq("id", id);

      if (error) {
        toast.error("Erro ao excluir nota: " + error.message);
      } else {
        toast.success("Nota excluída com sucesso!");
        setNotas(notas.filter((nota) => nota.id !== id));
      }
    }
  };

  return (
        <div className="p-8">

        {/* 🔹 Campo de Pesquisa */}
        <div className="mb-4 flex flex-col-2 gap-6">
          <Input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
                  <Button onClick={() => router.push("/dashboard/financial/add")} className="w-full sm:w-auto">
            Add Financial
          </Button>
        </div>

      {/* 🔹 Tabela de Notas */}
      <div className="p-4 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notasFiltradas.length > 0 ? (
              notasFiltradas.map((nota) => (
                <TableRow key={nota.id} onClick={() => openModal(nota)} className="cursor-pointer hover:bg-gray-100">
                  <TableCell>{nota.data}</TableCell>
                  <TableCell>{nota.fornecedor}</TableCell>
                  <TableCell>{nota.descricao}</TableCell>
                  <TableCell>{nota.categoria}</TableCell>
                  <TableCell>R$ {nota.valor.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(nota.id)}>
                      <Trash className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhuma nota encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 🔹 Modal de Detalhes da Nota */}
      {selectedNota && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle>Detalhes da Nota</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>Data:</strong> {selectedNota.data}</p>
              <p><strong>Fornecedor:</strong> {selectedNota.fornecedor}</p>
              <p><strong>Descrição:</strong> {selectedNota.descricao}</p>
              <p><strong>Categoria:</strong> {selectedNota.categoria}</p>
              <p><strong>Valor:</strong> R$ {selectedNota.valor.toFixed(2)}</p>
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="destructive" onClick={() => handleDelete(selectedNota.id)}>
                <Trash className="mr-2 h-4 w-4" /> Excluir
              </Button>
              <Button onClick={() => router.push(`/dashboard/financeiro/${selectedNota.id}/editar`)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar Nota
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}