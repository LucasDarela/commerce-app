"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Trash, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";
import Link from "next/link";
import { getReservedStock } from "@/lib/stock/getReservedStock";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateNextNoteNumber } from "@/lib/generate-next-note-number";
import { Textarea } from "@/components/ui/textarea";
import { parseISO } from "date-fns";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { orderSchema, type Order } from "@/components/types/orderSchema";

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

type LineItem = {
  id: number | string;
  name: string;
  quantity: number;
  standard_price: number;
};

type PaymentMethod = "Pix" | "Dinheiro" | "Cartao" | "Boleto";

interface Product {
  id: number;
  code: string;
  name: string;
  standard_price: number;
  stock: number;
}

type EditableOrder = Partial<Order> & { customer_id?: string };

type OrderFormData = z.infer<typeof orderSchema>;

function formatProductsForOrder(items: { name: string; quantity: number }[]) {
  return items.map((item) => `${item.name} (x${item.quantity})`).join(", ");
}

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = useParams<{ id: string }>();
  const { companyId, user } = useAuthenticatedCompany();
  const orderId = id as string;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [order, setOrder] = useState<EditableOrder | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [standardPrice, setStandardPrice] = useState<number | "">("");
  const [freight, setFreight] = useState<number>(0);
  const [appointment, setAppointment] = useState({
    date: undefined as Date | undefined,
    hour: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [text_note, setTextNote] = useState<string>("");
  const [reservedStock, setReservedStock] = useState<number>(0);
  const [originalDueDate, setOriginalDueDate] = useState<Date | null>(null);
  const [calculatedDueDate, setCalculatedDueDate] = useState<Date | null>(null);

  const [orderItems, setOrderItems] = useState<LineItem[]>([]);

  const [priceTableItems, setPriceTableItems] = useState<
    { product_id: string; price: number }[]
  >([]);

  useEffect(() => {
    async function checkIfBoletoExists() {
      const { data, error } = await supabase
        .from("orders")
        .select("boleto_id")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("Erro ao verificar boleto:", error);
        return;
      }

      if (data?.boleto_id) {
        toast.error("Essa venda já possui boleto e não pode ser editada.");
        router.push("/dashboard/orders");
      }
    }

    checkIfBoletoExists();
  }, [params.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const [
        { data: productsData, error: productsError },
        { data: customersData, error: customersError },
        { data: orderData, error: orderError },
        { data: orderItemsData, error: itemsError },
      ] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase
          .from("order_items")
          .select("*")
          .eq("order_id", id)
          .order("id", { ascending: true }),
      ]);

      if (productsError || customersError || orderError || itemsError) {
        toast.error("Erro ao carregar dados.");
        console.error({
          productsError,
          customersError,
          orderError,
          itemsError,
        });
        return;
      }

      if (!orderData || !orderItemsData) {
        toast.error("Venda não encontrada.");
        return;
      }

      setProducts(productsData || []);
      setCustomers(customersData || []);
      setOrder(orderData);
      setTextNote(orderData.text_note || "");

      setOriginalDueDate(
        orderData.due_date ? parseISO(orderData.due_date) : null,
      );
      setCalculatedDueDate(
        orderData.due_date ? parseISO(orderData.due_date) : null,
      );
      setFreight(Number(orderData.freight || 0));
      setAppointment({
        date: orderData.appointment_date
          ? parseISO(orderData.appointment_date)
          : undefined,
        hour: orderData.appointment_hour || "",
        location: orderData.appointment_local || "",
      });

      const customer = customersData?.find(
        (c) => c.id === orderData.customer_id,
      );
      if (customer) {
        setSelectedCustomer(customer);
        setSearchCustomer(customer.name);
      }

      // ✅ Mapeando os produtos com ordem correta
      const parsedItems = orderItemsData.map((item) => {
        const product = productsData?.find((p) => p.id === item.product_id);
        return {
          id: item.product_id,
          quantity: item.quantity,
          standard_price: item.price,
          name: product?.name || "Produto não encontrado",
        };
      });

      setOrderItems(parsedItems);
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchReservedStock = async () => {
      if (!selectedProduct) return;

      const reserved = await getReservedStock(selectedProduct.id);
      const available = selectedProduct.stock - reserved;

      setReservedStock(reserved);
    };

    fetchReservedStock();
  }, [selectedProduct, quantity]);

  useEffect(() => {
    if (!appointment.date || !order?.days_ticket) return;

    const dias = Number(order.days_ticket);
    if (isNaN(dias)) return;

    const novaData = new Date(appointment.date);
    novaData.setDate(novaData.getDate() + dias);
    setCalculatedDueDate(novaData);
  }, [appointment.date, order?.days_ticket]);

  useEffect(() => {
    const fetchPriceTableItems = async () => {
      if (!selectedCustomer?.price_table_id) return;

      const { data, error } = await supabase
        .from("price_table_products")
        .select("product_id, price")
        .eq("price_table_id", selectedCustomer.price_table_id);

      if (error) {
        toast.error("Erro ao buscar preços personalizados.");
        return;
      }

      setPriceTableItems(data || []);
    };

    fetchPriceTableItems();
  }, [selectedCustomer?.price_table_id]);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrder({ ...order, customer_id: customer.id });
    setSearchCustomer(customer.name);
    setShowCustomers(false);
  };

  const addItem = () => {
    if (selectedProduct && standardPrice !== "") {
      setOrderItems([
        ...orderItems,
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
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getTotal = () =>
    orderItems.reduce(
      (acc, item) => acc + item.standard_price * item.quantity,
      0,
    ) + freight;

  const handleUpdate = async () => {
    if (!order || !id) return;

    setLoading(true);

    try {
      const total = getTotal();

      // Atualiza a venda (tabela orders)
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          document_type: order.document_type,
          note_number: order.note_number,
          payment_method: order.payment_method,
          days_ticket: order.days_ticket,
          freight: freight,
          total: total,
          text_note: text_note,
          amount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
          products: formatProductsForOrder(orderItems),
          appointment_date: appointment.date
            ? appointment.date.toISOString().split("T")[0]
            : null,
          appointment_hour: appointment.hour,
          appointment_local: appointment.location,
          customer_id: selectedCustomer?.id,
        })
        .eq("id", id);

      if (orderError) {
        console.error(orderError);
        toast.error("Erro ao salvar a venda.");
        return;
      }

      // Deleta os itens antigos da tabela order_items
      await supabase.from("order_items").delete().eq("order_id", id);

      // Insere os novos itens
      const newItems = orderItems.map((item) => ({
        order_id: id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.standard_price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(newItems);

      if (itemsError) {
        console.error(itemsError);
        toast.error("Erro ao salvar os produtos da venda.");
        return;
      }

      toast.success("Venda atualizada com sucesso!");
      router.push("/dashboard/orders");
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado ao salvar a venda.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    if (!product) return;

    setOrderItems((prevItems) => {
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

    const priceItem = priceTableItems.find(
      (item) => item.product_id === product.id.toString(),
    );
    const price = priceItem?.price ?? product.standard_price;

    setSelectedProduct(product);
    setStandardPrice(price);
  };

  const handleChangeProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    if (!product) return;

    setOrderItems((prevItems) => {
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

  const handleEditQuantity = (index: number, value: string) => {
    setOrderItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: Number(value) || 0,
      };
      return updatedItems;
    });
  };

  const handleEditPrice = (index: number, value: string) => {
    setOrderItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        standard_price: Number(value) || 0,
      };
      return updatedItems;
    });
  };

  const customersFiltered = searchCustomer.trim()
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
          customer.document.includes(searchCustomer),
      )
    : [];

  if (!order) {
    return <div className="p-6 text-center">Carregando venda...</div>;
  }

  const issueDate = order?.issue_date ?? new Date().toISOString().split("T")[0];
  const daysTicket = Number(order?.days_ticket ?? 0);
  // Converter issueDate para Date
  const dueDate = calculatedDueDate
    ? format(calculatedDueDate, "dd/MM/yyyy")
    : "";

  const productById = new Map(products.map((p) => [String(p.id), p]));

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Venda</h1>
      {/* Select Document Type */}
      <Card className="mb-6">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Informações do Documento</h2>
          <div className="flex gap-4 w-full">
            <Select
              value={order.document_type}
              disabled
              onValueChange={async (value) => {
                let generatedNoteNumber = order.note_number;
                if (value === "internal" && companyId) {
                  generatedNoteNumber = await generateNextNoteNumber(companyId);
                }
                setOrder((prev) => ({
                  ...prev,
                  document_type: value,
                  note_number: generatedNoteNumber,
                }));
              }}
            >
              <SelectTrigger className="w-full border rounded-md shadow-sm">
                <SelectValue placeholder="Tipo de Documento" />
              </SelectTrigger>
              <SelectContent className="shadow-md rounded-md">
                <SelectItem value="internal">Interno</SelectItem>
                <SelectItem value="invoice">Fiscal</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Número da Nota"
              value={order?.note_number || ""}
              onChange={(e) =>
                setOrder((prev) => ({ ...prev, note_number: e.target.value }))
              }
              className="w-full"
            />

            <div className="flex items-center gap-2 w-full">
              <span className="text-sm text-muted-foreground font-medium hidden sm:inline">
                Emissão:
              </span>
              <Input
                id="issue_date"
                value={
                  order?.issue_date
                    ? format(new Date(order.issue_date), "dd/MM/yyyy")
                    : ""
                }
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
                let days = "0";
                if (value.toLowerCase() === "boleto") days = "10";

                if (!["Pix", "Dinheiro", "Cartao", "Boleto"].includes(value))
                  return;

                setOrder((prev) => ({
                  ...prev,
                  payment_method: value as
                    | "Pix"
                    | "Dinheiro"
                    | "Cartao"
                    | "Boleto",
                  days_ticket: days,
                }));
              }}
            >
              <SelectTrigger className="w-full border rounded-md shadow-sm">
                <SelectValue placeholder="Pagamento" />
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
              disabled={["pix", "dinheiro"].includes(
                order?.payment_method?.toLowerCase() || "",
              )}
              className={`w-full border rounded-md shadow-sm ${
                ["pix", "dinheiro"].includes(
                  order?.payment_method?.toLowerCase() || "",
                )
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
                value={dueDate}
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
                <Button variant="default" className="w-full">
                  Adicionar
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              value={selectedCustomer?.document ?? ""}
              readOnly
              placeholder="Documento"
              className="bg-muted"
            />
            <Input
              value={selectedCustomer?.phone ?? ""}
              readOnly
              placeholder="Telefone"
              className="bg-muted"
            />
            <Input
              value={selectedCustomer?.address ?? ""}
              readOnly
              placeholder="Endereço"
              className="bg-muted"
            />
            <Input
              value={selectedCustomer?.zip_code ?? ""}
              readOnly
              placeholder="CEP"
              className="bg-muted"
            />
            <Input
              value={selectedCustomer?.neighborhood ?? ""}
              readOnly
              placeholder="Bairro"
              className="bg-muted"
            />
            <Input
              value={selectedCustomer?.city ?? ""}
              readOnly
              placeholder="Cidade"
              className="bg-muted"
            />
            <Input
              value={selectedCustomer?.state ?? ""}
              readOnly
              placeholder="Estado"
              className="bg-muted"
            />
            <Input
              value={selectedCustomer?.number ?? ""}
              readOnly
              placeholder="Número"
              className="bg-muted"
            />
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
                {products
                  .slice()
                  .sort((a, b) => Number(a.code) - Number(b.code))
                  .map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.code} - {product.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              className="col-span-2 w-full cursor-pointer"
              onClick={addItem}
            >
              Adicionar Produto
            </Button>
          </div>

          {/* Seção da Tabela Editável */}
          <div className="w-full overflow-x-auto">
            <Table className="table-fixed w-full min-w-[600px] mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Produto</TableHead>
                  <TableHead className="w-[100px]">Quantidade</TableHead>
                  <TableHead className="w-[120px]">Preço</TableHead>
                  <TableHead className="w-[60px]">Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item, index) => {
                  const p = productById.get(String(item.id));
                  const label = p
                    ? `${p.code} - ${p.name}`
                    : "Produto indisponível";

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="w-[300px] truncate rounded-md border bg-muted/40 px-3 py-2 text-sm select-none">
                          {label}
                        </div>
                      </TableCell>

                      <TableCell className="w-[100px]">
                        <Input
                          className="w-full text-left"
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleEditQuantity(index, e.target.value)
                          }
                        />
                      </TableCell>

                      <TableCell className="w-[120px]">
                        <Input
                          className="w-full text-left"
                          type="number"
                          value={item.standard_price}
                          onChange={(e) =>
                            handleEditPrice(index, e.target.value)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Trash
                          className="cursor-pointer text-red-500"
                          onClick={() => removeItem(index)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
                  <Button
                    variant="outline"
                    className="w-full flex justify-between cursor-pointer hover:bg-gray-100"
                  >
                    {appointment.date
                      ? format(appointment.date, "dd/MM/yyyy")
                      : "Data da Entrega"}
                    <CalendarIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-[260px] shadow-lg rounded-md p-2 z-50 border"
                  align="center"
                  side="bottom"
                >
                  <DatePicker
                    selected={appointment.date}
                    onChange={(date: Date | null) =>
                      setAppointment((prev) => ({
                        ...prev,
                        date: date || undefined,
                      }))
                    }
                    dateFormat="dd/MM/yyyy"
                    className="hidden"
                    inline
                  />
                  {errors.appointment_date && (
                    <p className="text-red-500 text-sm">
                      {errors.appointment_date.message}
                    </p>
                  )}
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                placeholder="Horário"
                className="w-full max-w-[140px] sm:max-w-full"
                value={appointment.hour}
                onChange={(e) =>
                  setAppointment({ ...appointment, hour: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center mt-4">
            <Input
              type="text"
              placeholder="Local da Entrega"
              value={appointment.location}
              onChange={(e) =>
                setAppointment({ ...appointment, location: e.target.value })
              }
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
            <Textarea
              value={text_note}
              onChange={(e) => setTextNote(e.target.value)}
              placeholder="Observação"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center mt-4">
            <div className="text-center font-bold">
              Total: R$ {getTotal().toFixed(2)}
            </div>
            <Button variant="default" onClick={handleUpdate} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
