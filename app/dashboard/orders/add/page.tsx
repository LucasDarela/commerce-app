"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { getReservedStock } from "@/lib/stock/getReservedStock"

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
  id: number;
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
}

export default function AddOrder() {
  const router = useRouter();
  const { companyId } = useAuthenticatedCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchCustomer, setSearchCustomer] = useState<string>("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [standardPrice, setStandardPrice] = useState<number | "">("");
  const [freight, setFreight] = useState<number>(0);
  const [items, setItems] = useState<any[]>([]);
  const [catalogPrices, setCatalogPrices] = useState<Record<string, number>>({})
  const [reservedStock, setReservedStock] = useState<number>(0)
  const [appointment, setAppointment] = useState({
    date: undefined as Date | undefined,
    hour: "",
    location: "",
  });
  const [order, setOrder] = useState<Order>({
    issue_date: new Date().toISOString().split("T")[0],
  });

  const [first_name, ...rest] = selectedCustomer?.name?.split(" ") || ["Cliente"];
  const last_name = rest.length > 0 ? rest.join(" ") : "Sobrenome";

  const issueDate = order?.issue_date ?? new Date().toISOString().split("T")[0]
const daysTicket = Number(order?.days_ticket ?? 0)

// Converter issueDate para Date
const dueDate = format(
  new Date(new Date(issueDate).getTime() + daysTicket * 24 * 60 * 60 * 1000),
  "dd/MM/yyyy"
)

  const [loading, setLoading] = useState<boolean>(false);
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("company_id", companyId);
      if (!error) setCustomers(data || []);
    };
    const fetchProducts = async () => {
      const { data, error } = await supabase
      .from("products")
      .select("id, code, name, standard_price, stock")
      .eq("company_id", companyId);

      if (!error) setProducts(data || []);
    };
    if (companyId) {
      fetchCustomers();
      fetchProducts();
    }
  }, [companyId]);

  const filteredCustomers = searchCustomer.trim()
    ? customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        customer.document.includes(searchCustomer)
      )
    : [];

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrder((prev) => ({ ...prev, customer_id: customer.id }));
    setSearchCustomer(customer.name);
    setShowCustomers(false);
    if (customer.price_table_id) {
      const { data, error } = await supabase
        .from("price_table_products")
        .select("product_id, price")
        .eq("price_table_id", customer.price_table_id);
  
      if (error) {
        console.error("Erro ao buscar preços do catálogo:", error.message);
        toast.error("Erro ao buscar preços do catálogo");
        setCatalogPrices({});
      } else {
        const pricesMap: Record<string, number> = {};
        data.forEach((item) => {
          pricesMap[item.product_id] = item.price;
        });
        setCatalogPrices(pricesMap);
      }
    } else {
      setCatalogPrices({});
    }
  };


  const addItem = () => {
    if (selectedProduct && standardPrice !== "") {
      setItems([
        ...items,
        {
          ...selectedProduct,
          quantity,
          standard_price: Number(standardPrice),
        },
      ]);
      setSelectedProduct(null);
      setQuantity(1);
      setStandardPrice("");
    } else {
      toast.error("Select a product and price.");
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleEditProduct = (index: number, productId: string) => {
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
  
  const handleEditQuantity = (index: number, quantity: string) => {
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: Number(quantity) || 0,
      };
      return updatedItems;
    });
  };
  
  const handleEditPrice = (index: number, price: string) => {
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        standard_price: Number(price) || 0,
      };
      return updatedItems;
    });
  };

  const getTotal = () => items.reduce((acc, item) => acc + item.standard_price * item.quantity, 0) + freight;

  const generateNoteNumber = (type: string) => {
    const timestamp = Date.now().toString().slice(-6);
    return type === "invoice" ? `${timestamp}` : `${timestamp}`;
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
  
    if (!order || !order.customer_id || items.length === 0) {
      toast.error("Select a customer and at least one product.");
      isSubmittingRef.current = false;
      return;
    }
  
    setLoading(true);
  
    const amount = items.reduce((acc, item) => acc + item.quantity, 0);
    const productsDescription = items.map((item) => `${item.name} (${item.quantity}x)`).join(", ");
    const total = getTotal();
  
    const capitalize = (text: string) =>
      text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  
    const newOrder = {
      customer_id: order!.customer_id,
      customer: selectedCustomer?.name ?? "N/A",
      phone: selectedCustomer?.phone ?? "N/A",
      products: productsDescription,
      amount,
      note_number: order.note_number,
      document_type: order!.document_type,
      payment_method: capitalize(order?.payment_method || ""),
      payment_status: "Pendente",
      days_ticket: ["Pix", "Dinheiro"].includes(capitalize(order?.payment_method || "")) ? "1" : order?.days_ticket || "1",
      total,
      freight,
      delivery_status: "Entregar",
      appointment_date: appointment.date ? format(appointment.date, "yyyy-MM-dd") : null,
      appointment_hour: appointment.hour,
      appointment_local: appointment.location,
      company_id: companyId,
      created_at: new Date().toISOString(),
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + Number(order?.days_ticket || 1) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };
  
    const { data: insertedOrder, error } = await supabase
      .from("orders")
      .insert([{ ...newOrder, order_index: 0 }])
      .select()
      .single();
  
    if (error) {
      toast.error("Failed to create order.");
      console.error("❌ Error inserting order:", error);
      setLoading(false);
      return;
    }
  
    const orderItems = items.map((item) => ({
      order_id: insertedOrder.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.standard_price,
    }));
  
    const { error: itemError } = await supabase.from("order_items").insert(orderItems);
  
    if (itemError) {
      toast.error("Order created but failed to insert items.");
      console.error("❌ Error inserting order items:", itemError);
    } else {
      toast.success("Order created successfully!");
      router.push("/dashboard/orders");
    }
  
    setLoading(false);
    isSubmittingRef.current = false;
  };

  const customersFiltered = searchCustomer.trim()
  ? customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      customer.document.includes(searchCustomer)
    )
  : [];

  const dropdownRef = useRef<HTMLDivElement>(null);

      // Fecha o dropdown ao clicar fora
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowCustomers(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    useEffect(() => {
      const fetchReservedStock = async () => {
        if (!selectedProduct) return
    
        const reserved = await getReservedStock(selectedProduct.id)
        const available = selectedProduct.stock - reserved
    
        // Você pode guardar isso num state ou mostrar direto
        setReservedStock(reserved)
    
        // Se quiser, pode emitir alerta
        if (quantity > available) {
          toast.warning("Atenção: quantidade maior que o estoque disponível para a data.")
        }
      }
    
      fetchReservedStock()
    }, [selectedProduct, quantity])

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Criar Venda</h1>
  
    {/* Select Document Type */}
    <Card className="mb-6">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-bold mb-4">Informações do Documento</h2>
        <div className="flex flex-cols w-full h-auto gap-4">
          <Select
            onValueChange={(value) => {
              const generatedNoteNumber = generateNoteNumber(value);
              setOrder((prev) => ({ ...prev, document_type: value, note_number: generatedNoteNumber }));
            }}
          >
            <SelectTrigger className="border rounded-md shadow-sm w-full">
              <SelectValue placeholder="Tipo de Documento" />
            </SelectTrigger>
            <SelectContent className="shadow-md rounded-md">
              <SelectItem value="internal">Interno</SelectItem>
              <SelectItem value="invoice">Fiscal</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Numero do Documento"
            value={order?.note_number || ""}
            onChange={(e) => setOrder((prev) => ({ ...prev, note_number: e.target.value }))}
          />
          <Input
            id="issue_date"
            value={order?.issue_date ? format(new Date(order.issue_date), "dd/MM/yyyy") : ""}
            readOnly
            className="cursor-not-allowed bg-muted"
          />
        </div>
        </CardContent>
        </Card>

        <Card className="mb-6">
        <CardContent>
          {/* Customer Info */}
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
              <div
                ref={dropdownRef}
                className="absolute z-10 mt-1 w-full border rounded-md shadow-md max-h-40 overflow-y-auto bg-muted"
              >
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

          {/* Display selected customer fields */}
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

    {/* Seção para Adicionar Novo Produto */}
    <div className="grid grid-cols-4 gap-4 items-center">
      <Select
        onValueChange={(value) => {
          const product = products.find((p) => p.id.toString() === value);
          if (product) {
            setSelectedProduct(product);
            const catalogPrice = catalogPrices[product.id];
            setStandardPrice(
              typeof catalogPrice === "number" ? catalogPrice : product.standard_price
            );
          }
        }}
      >
        <SelectTrigger className="border rounded-md shadow-sm w-full col-span-2 truncate ">
          <SelectValue placeholder="Selecionar Produto" />
        </SelectTrigger>
        <SelectContent className="shadow-md rounded-md z-50">
          {products.map((product) => (
            <SelectItem
              key={product.id}
              value={product.id.toString()}
              className="cursor-pointer"
            >
              {product.code} - {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
          <Button
        className="col-span-2 w-full cursor-pointer"
        onClick={() => {
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
          } else {
            toast.error("Selecione um produto e defina o preço.");
          }
        }}
      >
        Adicionar
      </Button>
    </div>


    {/* Seção Forma de Pagamento */}
    <div className="grid grid-cols-3 gap-4 items-center">
    <Select
        value={order?.payment_method || ""}
        onValueChange={(value) =>
          setOrder((prev) => ({
            ...prev,
            payment_method: value,
            days_ticket: value.toLowerCase() === "boleto" ? "12" : value.toLowerCase() === "cartao" ? "1" : prev?.days_ticket,
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
        value={order?.days_ticket || ""}
        onChange={(e) => setOrder((prev) => ({ ...prev, days_ticket: e.target.value }))}
        disabled={["pix", "dinheiro"].includes(order?.payment_method?.toLowerCase() || "")}
        className={`w-full border rounded-md shadow-sm ${
          ["Pix", "Dinheiro"].includes((order?.payment_method || "").toLowerCase())
            ? "cursor-not-allowed bg-gray-100 text-gray-500"
            : ""
        }`}
      />
        <Input
    id="due_date"
    value={dueDate}
    readOnly
    className="cursor-not-allowed bg-muted"
  />

    </div>

    {/* Seção da Tabela Editável */}
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Quantidade</TableHead>
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
                onValueChange={(value) => handleEditProduct(index, value)}
              >
                <SelectTrigger className="w-[300px] truncate border rounded-md shadow-sm">
                  <SelectValue
                    placeholder="Produto"
                    defaultValue={item.name}
                  />
                </SelectTrigger>
                <SelectContent className="shadow-md rounded-md">
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.code} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => handleEditQuantity(index, e.target.value)}
              />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                value={item.standard_price}
                onChange={(e) => handleEditPrice(index, e.target.value)}
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
  
          {/* Appointment Info */}
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
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                placeholder="Horário"
                value={appointment.hour}
                onChange={(e) => setAppointment({ ...appointment, hour: e.target.value })}
              />

              <Input
                type="text"
                placeholder="Local de Entrega"
                value={appointment.location}
                onChange={(e) => setAppointment({ ...appointment, location: e.target.value })}
              />
            </div>
          </div>
  
          <div className="grid grid-cols-3 gap-4 items-center mt-4">
          <Input
              type="number"
              placeholder="Frete"
              value={freight ?? ""}
              onChange={(e) => setFreight(Number(e.target.value) || 0)}
            />
            <div className="font-bold">Total: R$ {getTotal().toFixed(2)}</div>
            <Button variant="default" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>

          {selectedProduct && (
            <p className="text-sm text-muted-foreground">
              Estoque atual: {selectedProduct.stock} — Reservado: {reservedStock}
            </p>
          )}
          </CardContent>
          </Card>
    </div>
  );
  };
