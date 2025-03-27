"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export default function ListOrders() {
  const router = useRouter();
  
  // Simulação de dados de vendas (será substituído por dados do Supabase)
  const [vendas, setVendas] = useState([
    { id: 1, cliente: "João Silva", produto: "Chopp Heineken", quantidade: 3, total: "R$ 150,00", pago: false },
    { id: 2, cliente: "Maria Souza", produto: "Chopp Amstel", quantidade: 2, total: "R$ 90,00", pago: true },
  ]);

  const [search, setSearch] = useState("");

  // Filtrar vendas com base na pesquisa
  const filteredVendas = vendas.filter((venda) =>
    venda.cliente.toLowerCase().includes(search.toLowerCase().trim()) ||
    venda.produto.toLowerCase().includes(search.toLowerCase().trim()) ||
    (search.toLowerCase() === "pago" && venda.pago) ||
    (search.toLowerCase() === "não pago" && !venda.pago)
  );
  const togglePago = (id: number) => {
    setVendas(vendas.map(venda => venda.id === id ? { ...venda, pago: !venda.pago } : venda));
  };
  return (
    <div className="p-8">
      {/* Campo de Pesquisa */}
      <div className="mb-4 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Pesquisar por Cliente, Produto ou Status de Pagamento (Pago/Não Pago)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
             <Button onClick={() => router.push("/dashboard/orders/add")}>Add Order</Button>
      </div>
{/* table */}
      <div className="p-6 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendas.map((venda) => (
              <TableRow key={venda.id}>
                <TableCell>{venda.id}</TableCell>
                <TableCell>{venda.cliente}</TableCell>
                <TableCell>{venda.produto}</TableCell>
                <TableCell>{venda.quantidade}</TableCell>
                <TableCell>{venda.total}</TableCell>
                <TableCell>
                  <Button variant="outline" size="icon" onClick={() => togglePago(venda.id)}>
                    {venda.pago ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-red-500" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </div>
  );
}