"use client";

import { useEffect, useState } from "react";
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
import { Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { toast } from "sonner";

export default function ListOrders() {
  const router = useRouter();
  const { companyId, loading } = useAuthenticatedCompany();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!companyId || loading) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total,
          payed,
          appointment_date,
          appointment_hour,
          appointment_local,
          customers(name)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar pedidos:", error);
        toast.error("Erro ao carregar pedidos");
        return;
      }

      setOrders(data);
    };

    fetchOrders();
  }, [companyId, loading]);

  const filteredOrders = orders.filter((order) => {
    const searchTerm = search.toLowerCase().trim();
    return (
      order.customers?.name?.toLowerCase().includes(searchTerm) ||
      order.total.toString().includes(searchTerm) ||
      (searchTerm === "pago" && order.payed) ||
      (searchTerm === "não pago" && !order.payed)
    );
  });

  const togglePayed = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("orders")
      .update({ payed: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status do pagamento");
      return;
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, payed: !currentStatus } : order
      )
    );
  };

  return (
    <div className="p-8">
      {/* Search and Add */}
      <div className="mb-4 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Search by Customer or Payment Status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
        <Button onClick={() => router.push("/dashboard/orders/add")}>Add Order</Button>
      </div>

      {/* Orders Table */}
      <div className="p-6 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Total (R$)</TableHead>
              <TableHead>Appointment</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Payed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.customers?.name || "-"}</TableCell>
                  <TableCell>{Number(order.total).toFixed(2)}</TableCell>
                  <TableCell>
                    {order.appointment_date} {order.appointment_hour}
                  </TableCell>
                  <TableCell>{order.appointment_local || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => togglePayed(order.id, order.payed)}
                    >
                      {order.payed ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}