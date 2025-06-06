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

interface Customer {
  id: string;
  name: string;
  document: string;
  phone: string;
  address: string;
  zip_code: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
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
}

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
      setFreight(Number(orderData.freight || 0));
      setAppointment({
        date: orderData.appointment_date ? new Date(orderData.appointment_date) : undefined,
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
  
      // 🔥 MONTA CORRETAMENTE O OBJETO A ENVIAR PARA O SUPABASE
      const updatedOrder = {
        document_type: order.document_type,
        note_number: order.note_number,
        payment_method: order.payment_method,
        days_ticket: order.days_ticket,
        freight,
        total,
        amount, // <- Novo
        products: productsDescription, // <- Novo
        appointment_date: appointment.date ? format(appointment.date, "yyyy-MM-dd") : null,
        appointment_hour: appointment.hour,
        appointment_local: appointment.location,
        customer_id: selectedCustomer ? selectedCustomer.id : order.customer_id, 
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
            <Input placeholder="Numero do Documento" value={order?.note_number || ""} onChange={(e) => setOrder({ ...order, note_number: e.target.value })} />
          </div>
        </CardContent>
      </Card>
  
      {/* Informações do Cliente */}
      <Card className="mb-6">
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Informações do Cliente</h2>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="col-span-4 relative">
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
            <Link href="/dashboard/customers/add">
              <Button variant="default" className="w-full">Adicionar</Button>
            </Link>
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
    <h2 className="text-xl font-bold mb-4">Produtos</h2>

    {/* Área de Adicionar Novo Produto */}
    <div className="grid grid-cols-4 gap-4 items-center">
      <Select onValueChange={(value) => handleSelectNewProduct(value)}>
      <SelectTrigger className="border rounded-md shadow-sm w-full col-span-2 truncate ">
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


      {/* <Input
        className="col-span-1"
        type="number"
        placeholder="Quantidade"
        value={quantity === 0 ? "" : quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />
      <Input
        placeholder="Preço"
        value={standardPrice || ""}
        onChange={(e) => setStandardPrice(Number(e.target.value) || 0)}
      /> */}
      <Button className="col-span-2 w-full cursor-pointer" onClick={addItem}>Adicionar Produto</Button>
    </div>

    {/* Seção Forma de Pagamento */}
    <div className="grid grid-cols-2 gap-4 items-center">
    <Select
        value={order.payment_method}
        onValueChange={(value) =>
          setOrder((prev) => ({
            ...prev,
            payment_method: value,
            days_ticket: value.toLowerCase() === "boleto" ? "12" : value.toLowerCase() === "cartao" ? "1" : prev?.days_ticket || "",
          }))
        }
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
        placeholder="Dias"
        value={order.days_ticket}
        onChange={(e) => setOrder((prev) => ({ ...prev, days_ticket: e.target.value }))}
        disabled={["pix", "dinheiro"].includes(order.payment_method?.toLowerCase() || "")}
        className={`w-full border rounded-md shadow-sm ${
          ["Pix", "Dinheiro"].includes(order.payment_method?.toLowerCase() || "")}
            ? "cursor-not-allowed bg-gray-100 text-gray-500"
            : ""
        }`}
      />
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
            <div className="grid grid-cols-3 gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full flex justify-between cursor-pointer hover:bg-gray-100">
                  {appointment.date ? format(appointment.date, "dd/MM/yyyy") : "Escolher Data"}
                  <CalendarIcon className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px]">
                <DatePicker
                  selected={appointment.date}
                  onChange={(date: Date | null) => setAppointment((prev) => ({ ...prev, date: date || undefined }))
                }
                  dateFormat="dd/MM/yyyy"
                  className="hidden"
                  inline
                />
              </PopoverContent>
            </Popover>
            <Input placeholder="Horário" type="time" value={appointment.hour} onChange={(e) => setAppointment({ ...appointment, hour: e.target.value })} />
            <Input placeholder="Local de Entrega" value={appointment.location} onChange={(e) => setAppointment({ ...appointment, location: e.target.value })} />
          </div>
          </div>
  
          <div className="grid grid-cols-3 gap-4 items-center mt-6">
            <Input
              type="number"
              placeholder="Frete"
              value={freight || ""}
              onChange={(e) => setFreight(Number(e.target.value) || 0)}
            />
            <div className="font-bold">Total: R$ {getTotal().toFixed(2)}</div>
            <Button variant="default" onClick={handleUpdate} disabled={loading}>
              {loading ? "Salvando..." : "Atualizar Venda"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};