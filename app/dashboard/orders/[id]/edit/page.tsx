"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Trash, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";
import Link from "next/link";
import { getReservedStock } from "@/lib/stock/getReservedStock"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { orderSchema, Order as OrderType } from "@/lib/fetchOrders"
import { generateNextNoteNumber } from "@/lib/generate-next-note-number";
import { Textarea } from "@/components/ui/textarea";
import { parseISO } from "date-fns"

interface Customer {
  id: string;
  name: string;
  type: string;
  document: string;
  phone: string;
  address: string;
  zip_code: string;     
  neighborhood: string;   
  city: string;
  state: string;
  number: string;         
  complement?: string;
  email?: string;
  price_table_id?: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  standard_price: number;
  stock: number;
}

interface Order {
  document_type?: string;
  note_number?: string;
  payment_method?: string;
  days_ticket?: string;
  freight?: number;
  total?: number;
  amount?: number;
  products?: string;
  appointment_date?: string | null;
  appointment_hour?: string;
  appointment_local?: string;
  customer_id?: string;
  issue_date?: string;
  text_note?: string;
  due_date?: string;
}
type OrderFormData = z.infer<typeof orderSchema>

export default function EditOrderPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [standardPrice, setStandardPrice] = useState<number | "">("");
  const [freight, setFreight] = useState<number>(0);
  const [appointment, setAppointment] = useState({ date: undefined as Date | undefined, hour: "", location: "" });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [text_note, setTextNote] = useState<string>("");
  const [reservedStock, setReservedStock] = useState<number>(0)
  const [originalDueDate, setOriginalDueDate] = useState<Date | null>(null);
  const [calculatedDueDate, setCalculatedDueDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
  
      const [
        { data: productsData, error: productsError },
        { data: customersData, error: customersError },
        { data: orderData, error: orderError },
        { data: orderItemsData, error: itemsError }
      ] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
  
      if (productsError || customersError || orderError || itemsError) {
        toast.error("Erro ao carregar dados.");
        console.error({ productsError, customersError, orderError, itemsError });
        return;
      }
  
      if (!orderData || !orderItemsData) {
        toast.error("Venda não encontrada.");
        return;
      }
  
      setProducts(productsData || []);
      setCustomers(customersData || []);
      setOrder(orderData);
      setOriginalDueDate(orderData.due_date ? parseISO(orderData.due_date) : null);
      setCalculatedDueDate(orderData.due_date ? parseISO(orderData.due_date) : null);
      setFreight(Number(orderData.freight || 0));
      setAppointment({
        date: orderData.appointment_date 
        ? parseISO(orderData.appointment_date)
        : undefined,
        hour: orderData.appointment_hour || "",
        location: orderData.appointment_local || "",
      });
  
      const customer = customersData?.find((c) => c.id === orderData.customer_id);
      if (customer) {
        setSelectedCustomer(customer);
        setSearchCustomer(customer.name);
      }
  
      // Produtos vinculados ao pedido
      const parsedItems = orderItemsData.map((item) => {
        const product = productsData?.find((p) => p.id === item.product_id);
        return {
          id: item.product_id,
          quantity: item.quantity,
          standard_price: item.price,
          name: product?.name || "Produto não encontrado",
        };
      });
  
      setItems(parsedItems);
    };
  
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchReservedStock = async () => {
      if (!selectedProduct) return
  
      const reserved = await getReservedStock(Number(selectedProduct.id))
      const available = selectedProduct.stock - reserved
  
      setReservedStock(reserved)
  
      if (quantity > available) {
        toast.warning("Atenção: quantidade maior que o estoque disponível para a data.")
      }
    }
  
    fetchReservedStock()
  }, [selectedProduct, quantity])

  useEffect(() => {
    if (!appointment.date || !order?.days_ticket) return;
  
    const dias = Number(order.days_ticket);
    if (isNaN(dias)) return;
  
    const novaData = new Date(appointment.date);
    novaData.setDate(novaData.getDate() + dias);
    setCalculatedDueDate(novaData);
  }, [appointment.date, order?.days_ticket]);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  })

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrder({ ...order, customer_id: customer.id });
    setSearchCustomer(customer.name);
    setShowCustomers(false);
  };

  const addItem = () => {
    if (selectedProduct && standardPrice !== "") {
      setItems([
        ...items,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          quantity,
          standard_price: Number(standardPrice),
        },
      ]);
      setSelectedProduct(null);
      setQuantity(1);
      setStandardPrice("");
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getTotal = () => items.reduce((acc, item) => acc + item.standard_price * item.quantity, 0) + freight;

  const handleUpdate = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const total = getTotal();
  
      // 🔥 NOVO: monta a descrição dos produtos
      const productsDescription = items
        .map((item) => `${item.name} (${item.quantity}x)`)
        .join(", ");
  
      // 🔥 NOVO: monta o total de itens vendidos
      const amount = items.reduce((acc, item) => acc + item.quantity, 0);

      const capitalize = (text: string) =>
        text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  
      // 🔥 MONTA CORRETAMENTE O OBJETO A ENVIAR PARA O SUPABASE
      const updatedOrder = {
        document_type: order.document_type,
        note_number: order.note_number,
        payment_method: order.payment_method,
        days_ticket:
        capitalize(order?.payment_method || "") === "Boleto"
          ? order?.days_ticket || "12"
          : "1",
        total,
        amount, 
        products: productsDescription, 
        appointment_date: appointment.date ? format(appointment.date, "yyyy-MM-dd") : null,
        appointment_hour: appointment.hour,
        appointment_local: appointment.location,
        customer_id: selectedCustomer ? selectedCustomer.id : order.customer_id, 
        due_date: calculatedDueDate
        ? format(calculatedDueDate, "yyyy-MM-dd")
        : null,
      text_note,
      };
  
      const { error: orderError } = await supabase
        .from("orders")
        .update(updatedOrder)
        .eq("id", id);
  
      // Atualiza itens
      await supabase.from("order_items").delete().eq("order_id", id);
  
      const newItems = items.map((item) => ({
        order_id: id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.standard_price,
      }));
  
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(newItems);
  
      if (orderError || itemsError) throw new Error("Erro ao atualizar venda");
  
      toast.success("Venda atualizada com sucesso!");
      router.push("/dashboard/orders");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar venda.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    if (!product) return;
  
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        id: product.id,
        name: product.name,
        standard_price: product.standard_price,
      };
      return updatedItems;
    });
  };

  const handleSelectNewProduct = (productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    if (!product) return;
    setSelectedProduct(product);
    setStandardPrice(product.standard_price);
  };
  
  const handleChangeProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    if (!product) return;
  
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        id: product.id,
        name: product.name,
        standard_price: product.standard_price,
      };
      return updatedItems;
    });
  };
  
  const handleChangeQuantity = (index: number, quantity: string) => {
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: Number(quantity) || 0,
      };
      return updatedItems;
    });
  };
  
  const handleChangePrice = (index: number, price: string) => {
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        standard_price: Number(price) || 0,
      };
      return updatedItems;
    });
  };

  const customersFiltered = searchCustomer.trim()
  ? customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      customer.document.includes(searchCustomer)
    )
  : [];

  if (!order) {
    return <div className="p-6 text-center">Carregando venda...</div>;
  }

  const issueDate = order?.issue_date ?? new Date().toISOString().split("T")[0]
  const daysTicket = Number(order?.days_ticket ?? 0)
  // Converter issueDate para Date
  const dueDate = order?.due_date
  ? format(parseISO(order.due_date), "dd/MM/yyyy")
  : "";

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Venda</h1>
      {/* Informações do Documento */}
      <Card className="mb-6">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Informações do Documento</h2>
          <div className="flex flex-col md:flex-row gap-4">
          <Select value={order?.document_type || ""} onValueChange={(value) => setOrder({ ...order, document_type: value })}>
              <SelectTrigger className="border rounded-md shadow-sm w-full">
                <SelectValue placeholder="Tipo de Documento" />
              </SelectTrigger>
              <SelectContent className="shadow-md rounded-md">
                <SelectItem value="internal">Interno</SelectItem>
                <SelectItem value="invoice">Fiscal</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Numero da Nota" value={order?.note_number || ""} onChange={(e) => setOrder({ ...order, note_number: e.target.value })} />
            <div className="flex items-center gap-2 w-full">
            <span className="text-sm text-muted-foreground font-medium hidden sm:inline">
              Emissão:
            </span>
            <Input
              id="issue_date"
              value={order?.issue_date ? format(new Date(order.issue_date), "dd/MM/yyyy") : ""}
              readOnly
              className="cursor-not-allowed bg-muted w-full"
            />
          </div>
          </div>
              {/* Seção Forma de Pagamento */}
    <div className="flex gap-4 items-center w-full mt-6">
    <Select
                value={order?.payment_method || ""}
                onValueChange={(value) => {
                  let days = "0"
                  if (value.toLowerCase() === "boleto") days = "12"

                  setOrder((prev) => ({
                    ...prev,
                    payment_method: value,
                    days_ticket: days,
                  }))
                }}
              >
        <SelectTrigger className="w-full border rounded-md shadow-sm">
          <SelectValue placeholder="Forma de Pagamento" />
        </SelectTrigger>
        <SelectContent className="w-full shadow-md rounded-md">
          <SelectItem value="Pix">Pix</SelectItem>
          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
          <SelectItem value="Cartao">Cartão</SelectItem>
          <SelectItem value="Boleto">Boleto</SelectItem>
        </SelectContent>
      </Select>

      <Input
                type="number"
                placeholder="Prazo"
                value={order?.days_ticket || ""}
                onChange={(e) =>
                  setOrder((prev) => ({ ...prev, days_ticket: e.target.value }))
                }
                disabled={["pix", "dinheiro"].includes(order?.payment_method?.toLowerCase() || "")}
                className={`w-full border rounded-md shadow-sm ${
                  ["pix", "dinheiro"].includes(order?.payment_method?.toLowerCase() || "")
                    ? "cursor-not-allowed bg-gray-100 text-gray-500"
                    : ""
                }`}
              />
                    <div className="flex items-center gap-2 w-full">
                <span className="text-sm text-muted-foreground font-medium hidden sm:inline">
                  Vencimento:
                </span>
                <Input
                  id="due_date"
                  value={calculatedDueDate ? format(calculatedDueDate, "dd/MM/yyyy") : ""}
                  readOnly
                  className="cursor-not-allowed bg-muted w-full"
                />
              </div>
    </div>
          
        </CardContent>
      </Card>
  
      {/* Informações do Cliente */}
      <Card className="mb-6">
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Informações do Cliente</h2>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="col-span-3 relative">
              <Input
                type="text"
                placeholder="Procurar Cliente..."
                value={searchCustomer}
                onChange={(e) => {
                  setSearchCustomer(e.target.value);
                  setShowCustomers(true);
                }}
              />
              {showCustomers && customersFiltered.length > 0 && (
                <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md max-h-40 overflow-y-auto bg-muted">
                  {customersFiltered.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-accent/60 transition-colors cursor-pointer"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      {customer.name} - {customer.document}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2">
            <Link href="/dashboard/customers/add">
              <Button variant="default" className="w-full">Adicionar</Button>
            </Link>
            </div>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            <Input value={selectedCustomer?.document ?? ""} readOnly placeholder="Documento" className="bg-muted" />
            <Input value={selectedCustomer?.phone ?? ""} readOnly placeholder="Telefone" className="bg-muted" />
            <Input value={selectedCustomer?.address ?? ""} readOnly placeholder="Endereço" className="bg-muted" />
            <Input value={selectedCustomer?.zip_code ?? ""} readOnly placeholder="CEP" className="bg-muted" />
            <Input value={selectedCustomer?.neighborhood ?? ""} readOnly placeholder="Bairro" className="bg-muted" />
            <Input value={selectedCustomer?.city ?? ""} readOnly placeholder="Cidade" className="bg-muted" />
            <Input value={selectedCustomer?.state ?? ""} readOnly placeholder="Estado" className="bg-muted" />
            <Input value={selectedCustomer?.number ?? ""} readOnly placeholder="Número" className="bg-muted" />
          </div>
        </CardContent>
      </Card>
  
      {/* Products */}
      <Card className="mb-6">
  <CardContent className="space-y-4">
    <h2 className="text-xl font-bold mb-4">Selecione os Produtos</h2>

    {/* Área de Adicionar Novo Produto */}
    <div className="grid grid-cols-5 gap-4 items-center">
      <Select onValueChange={(value) => handleSelectNewProduct(value)}>
      <SelectTrigger className="border rounded-md shadow-sm w-full col-span-3 truncate ">
          <SelectValue placeholder="Selecionar Produto" />
        </SelectTrigger>
        <SelectContent className="shadow-md rounded-md z-50">
          {products.map((product) => (
            <SelectItem key={product.id} value={product.id.toString()}>
              {product.code} - {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button className="col-span-2 w-full cursor-pointer" onClick={addItem}>Adicionar Produto</Button>
    </div>

    {/* Área da Tabela de Produtos */}
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Qtd</TableHead>
          <TableHead>Preço</TableHead>
          <TableHead>Excluir</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={index}>
            <TableCell>
              <Select
                value={item.id}
                onValueChange={(value) => handleChangeProduct(index, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar Produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => handleChangeQuantity(index, e.target.value)}
              />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                value={item.standard_price}
                onChange={(e) => handleChangePrice(index, e.target.value)}
              />
            </TableCell>
            <TableCell>
              <Trash className="cursor-pointer text-red-500" onClick={() => removeItem(index)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
  
      {/* Agendamento e Total */}
      <Card>
          <CardContent>
          <div>
            <h2 className="text-xl font-bold mb-4">Agendamento de Entrega</h2>
            <div className="grid grid-cols-2 gap-4">
            <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full flex justify-between cursor-pointer hover:bg-gray-100">
                    {appointment.date ? format(appointment.date, "dd/MM/yyyy") : "Data da Entrega"}
                    <CalendarIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[260px] shadow-lg rounded-md p-2 z-50 border" align="center" side="bottom">
                  <DatePicker
                    selected={appointment.date}
                    onChange={(date: Date | null) =>
                      setAppointment((prev) => ({ ...prev, date: date || undefined }))
                    }
                    dateFormat="dd/MM/yyyy"
                    className="hidden"
                    inline
                  />
                    {errors.appointment_date && (
                    <p className="text-red-500 text-sm">{errors.appointment_date.message}</p>
                  )}
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                placeholder="Horário"
                value={appointment.hour}
                onChange={(e) => setAppointment({ ...appointment, hour: e.target.value })}
              />
            </div>
          </div>
  
          <div className="grid grid-cols-2 gap-4 items-center mt-4">
          <Input
                type="text"
                placeholder="Local da Entrega"
                value={appointment.location}
                onChange={(e) => setAppointment({ ...appointment, location: e.target.value })}
              />
            <Input
              type="number"
              placeholder="Frete"
              value={freight === 0 ? "" : freight}
              onChange={(e) => {
                const value = e.target.value;
                setFreight(value === "" ? 0 : Number(value));
              }}
            />
          </div>

          <div className="flex mt-4">
          <Textarea value={text_note} onChange={(e) => setTextNote (e.target.value)} placeholder="Observação"/>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center mt-4">
          <div className="text-center font-bold">Total: R$ {getTotal().toFixed(2)}</div>
            <Button variant="default" onClick={handleUpdate} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          </CardContent>
          </Card>
    </div>
  );
};