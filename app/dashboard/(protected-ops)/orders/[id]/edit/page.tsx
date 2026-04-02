"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
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
import {
  Trash,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
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
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { orderSchema, type Order } from "@/components/types/orderSchema";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  fantasy_name?: string | null;
  company_id?: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  standard_price: number;
  stock: number;
  company_id?: string;
}

type Driver = {
  id: string;
  name: string;
};

type LineItem = {
  id: number | string;
  name: string;
  quantity: number;
  standard_price: number;
};

type EditableOrder = Partial<Order> & {
  customer_id?: string | null;
  driver_id?: string | null;
};

type OrderFormData = z.infer<typeof orderSchema>;

function formatProductsForOrder(items: { name: string; quantity: number }[]) {
  return items.map((item) => `${item.name} (${item.quantity}x)`).join(", ");
}

export default function EditOrderPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { companyId, loading: companyLoading } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const orderId = id as string;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);

  const [order, setOrder] = useState<EditableOrder | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [standardPrice, setStandardPrice] = useState<number | "">("");
  const [freight, setFreight] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [text_note, setTextNote] = useState<string>("");
  const [reservedStock, setReservedStock] = useState<number>(0);

  const [appointment, setAppointment] = useState({
    date: undefined as Date | undefined,
    hour: "00:00",
    location: "",
  });

  const [orderItems, setOrderItems] = useState<LineItem[]>([]);
  const [priceTableItems, setPriceTableItems] = useState<
    { product_id: string; price: number }[]
  >([]);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const driverValue = selectedDriverId ?? "none";

  const [productOpen, setProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowCustomers(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!appointment.date) return;

    const method = order?.payment_method?.toLowerCase() ?? "";
    const days = Number(order?.days_ticket ?? 0);

    let due: string;

    if (["pix", "dinheiro", "cartao"].includes(method)) {
      due = format(appointment.date, "yyyy-MM-dd");
    } else {
      const calculatedDate = new Date(
        appointment.date.getTime() + days * 24 * 60 * 60 * 1000,
      );
      due = format(calculatedDate, "yyyy-MM-dd");
    }

    setOrder((prev) => (prev ? { ...prev, due_date: due } : prev));
  }, [appointment.date, order?.payment_method, order?.days_ticket]);

  useEffect(() => {
    if (!companyId) return;

    const fetchBaseData = async () => {
      const [
        { data: customersData, error: customersError },
        { data: productsData, error: productsError },
        { data: driversData, error: driversError },
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .eq("company_id", companyId)
          .order("name", { ascending: true }),
        supabase
          .from("products")
          .select("id, code, name, standard_price, stock")
          .eq("company_id", companyId),
        supabase
          .from("profiles")
          .select("id, username, email")
          .eq("company_id", companyId)
          .order("username", { ascending: true }),
      ]);

      if (customersError) {
        console.error("Erro ao buscar clientes:", customersError);
      } else {
        setCustomers(customersData || []);
      }

      if (productsError) {
        console.error("Erro ao buscar produtos:", productsError);
      } else {
        setProducts(productsData || []);
      }

      if (driversError) {
        console.error("Erro ao buscar motoristas:", driversError);
      } else {
        const mappedDrivers: Driver[] = (driversData ?? []).map((p: any) => ({
          id: p.id,
          name: p.username || p.email || "Sem nome",
        }));
        setDrivers(mappedDrivers);
      }
    };

    fetchBaseData();
  }, [companyId, supabase]);

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!orderId || !companyId) return;

      const [
        { data: orderData, error: orderError },
        { data: orderItemsData, error: itemsError },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .eq("company_id", companyId)
          .single(),
        supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderId)
          .order("id", { ascending: true }),
      ]);

      if (orderError || itemsError) {
        console.error({ orderError, itemsError });
        toast.error("Erro ao carregar dados da venda.");
        return;
      }

      if (!orderData) {
        toast.error("Venda não encontrada.");
        return;
      }

      setOrder(orderData);
      setTextNote(orderData.text_note || "");
      setFreight(Number(orderData.freight || 0));
      setSelectedDriverId(orderData.driver_id ?? null);

      setAppointment({
        date: orderData.appointment_date
          ? parseISO(orderData.appointment_date)
          : undefined,
        hour: orderData.appointment_hour || "00:00",
        location: orderData.appointment_local || "",
      });

      const customer = customers.find((c) => c.id === orderData.customer_id);
      if (customer) {
        setSelectedCustomer(customer);
        setSearchCustomer(customer.name);
      }

      const parsedItems = (orderItemsData || []).map((item) => {
        const product = products.find((p) => p.id === item.product_id);

        return {
          id: item.product_id,
          quantity: Number(item.quantity || 0),
          standard_price: Number(item.price || 0),
          name: product?.name || "Produto não encontrado",
        };
      });

      setOrderItems(parsedItems);
    };

    if (customers.length > 0 && products.length > 0) {
      fetchOrderData();
    }
  }, [orderId, companyId, supabase, customers, products]);

  useEffect(() => {
    const checkIfBoletoExists = async () => {
      if (!orderId || !companyId) return;

      const { data, error } = await supabase
        .from("orders")
        .select("boleto_id")
        .eq("id", orderId)
        .eq("company_id", companyId)
        .single();

      if (error) {
        console.error("Erro ao verificar boleto:", error);
        return;
      }

      if (data?.boleto_id) {
        toast.error("Essa venda já possui boleto e não pode ser editada.");
        router.push("/dashboard/orders");
      }
    };

    checkIfBoletoExists();
  }, [orderId, companyId, router, supabase]);

  useEffect(() => {
    const fetchPriceTableItems = async () => {
      if (!selectedCustomer?.price_table_id || !companyId) {
        setPriceTableItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("price_table_products")
        .select("product_id, price")
        .eq("price_table_id", selectedCustomer.price_table_id);

      if (error) {
        console.error("Erro ao buscar preços personalizados:", error);
        toast.error("Erro ao buscar preços personalizados.");
        setPriceTableItems([]);
        return;
      }

      setPriceTableItems(data || []);
    };

    fetchPriceTableItems();
  }, [selectedCustomer?.price_table_id, companyId, supabase]);

  useEffect(() => {
    const fetchReservedStock = async () => {
      if (!selectedProduct || !companyId) return;

      const reserved = await getReservedStock(selectedProduct.id, companyId);
      setReservedStock(reserved);
    };

    fetchReservedStock();
  }, [selectedProduct, companyId]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrder((prev) => (prev ? { ...prev, customer_id: customer.id } : prev));
    setSearchCustomer(customer.name);
    setShowCustomers(false);
  };

  const addItem = () => {
    if (selectedProduct && standardPrice !== "") {
      setOrderItems((prev) => [
        ...prev,
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
      setProductSearch("");
      setProductOpen(false);
    } else {
      toast.error("Selecione um produto e defina o preço.");
    }
  };

  const removeItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditQuantity = (index: number, value: string) => {
    setOrderItems((prevItems) => {
      const updatedItems = [...prevItems];
      const parsed = Number(value);

      updatedItems[index] = {
        ...updatedItems[index],
        quantity: value === "" ? 1 : Math.max(1, parsed || 1),
      };

      return updatedItems;
    });
  };

const handleEditPrice = (index: number, value: string) => {
  setOrderItems((prevItems) => {
    const updatedItems = [...prevItems];
    const parsed = Number(value);

    updatedItems[index] = {
      ...updatedItems[index],
      standard_price: value === "" ? 0 : Math.max(0, parsed || 0),
    };

    return updatedItems;
  });
};

  const getTotal = () =>
    orderItems.reduce(
      (acc, item) => acc + Number(item.standard_price) * Number(item.quantity),
      0,
    ) + Number(freight);

  const handleSelectNewProduct = (product: Product) => {
    const priceItem = priceTableItems.find(
      (item) => item.product_id === product.id.toString(),
    );

    const price = Number(priceItem?.price ?? product.standard_price ?? 0);

    setSelectedProduct(product);
    setStandardPrice(price);
    setProductOpen(false);
    setProductSearch("");
  };

  const handleUpdate = async () => {
    if (!order || !orderId || !companyId) return;

    if (!selectedCustomer?.id) {
      toast.error("Selecione um cliente.");
      return;
    }

    if (!appointment.date) {
      toast.error("Selecione a data de entrega.");
      return;
    }

    if (!orderItems.length) {
      toast.error("Adicione ao menos um produto.");
      return;
    }

    const invalidItem = orderItems.find(
      (item) => Number(item.quantity) < 1 || Number(item.standard_price) < 0,
    );

    if (invalidItem) {
      toast.error(
        `O produto "${invalidItem.name}" está com quantidade ou preço inválido.`,
      );
      return;
    }

    setLoading(true);

    try {
      const total = getTotal();
      const amount = orderItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          document_type: order.document_type,
          note_number: order.note_number,
          payment_method: order.payment_method,
          days_ticket: order.days_ticket,
          freight,
          total,
          text_note,
          amount,
          products: formatProductsForOrder(orderItems),
          appointment_date: format(appointment.date, "yyyy-MM-dd"),
          appointment_hour: appointment.hour,
          appointment_local: appointment.location,
          customer_id: selectedCustomer.id,
          due_date: order.due_date ?? null,
          driver_id: selectedDriverId,
        })
        .eq("id", orderId)
        .eq("company_id", companyId);

      if (orderError) {
        console.error(orderError);
        toast.error("Erro ao salvar a venda.");
        return;
      }

      const { error: deleteItemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (deleteItemsError) {
        console.error(deleteItemsError);
        toast.error("Erro ao limpar os produtos antigos da venda.");
        return;
      }

      const newItems = orderItems.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        quantity: Number(item.quantity),
        price: Number(item.standard_price),
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

  const customersFiltered = searchCustomer.trim()
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
          (customer.fantasy_name &&
            customer.fantasy_name
              .toLowerCase()
              .includes(searchCustomer.toLowerCase())) ||
          (customer.document ?? "").includes(searchCustomer),
      )
    : customers;

  const filteredProducts = products
    .slice()
    .sort((a, b) => Number(a.code) - Number(b.code))
    .filter((product) => {
      const search = productSearch.toLowerCase().trim();
      if (!search) return true;

      return (
        product.name.toLowerCase().includes(search) ||
        String(product.code).toLowerCase().includes(search)
      );
    });

  const dueDate = order?.due_date
    ? format(parseISO(order.due_date), "dd/MM/yyyy")
    : "";

  const productById = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    products.forEach((p) => m.set(String(p.id), p));
    return m;
  }, [products]);

  if (companyLoading || !order) {
    return <div className="p-6 text-center">Carregando venda...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Venda</h1>

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

                setOrder((prev) =>
                  prev
                    ? {
                        ...prev,
                        document_type: value,
                        note_number: generatedNoteNumber,
                      }
                    : prev,
                );
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
                setOrder((prev) =>
                  prev ? { ...prev, note_number: e.target.value } : prev,
                )
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

          <div className="flex gap-4 items-center w-full mt-6">
            <Select
              value={order?.payment_method || ""}
              onValueChange={(value) => {
                let days = "0";
                if (value.toLowerCase() === "boleto") days = "10";

                if (!["Pix", "Dinheiro", "Cartao", "Boleto"].includes(value)) {
                  return;
                }

                setOrder((prev) =>
                  prev
                    ? {
                        ...prev,
                        payment_method: value as
                          | "Pix"
                          | "Dinheiro"
                          | "Cartao"
                          | "Boleto",
                        days_ticket: days,
                      }
                    : prev,
                );
              }}
            >
              <SelectTrigger className="w-full border rounded-md shadow-sm truncate">
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
                setOrder((prev) =>
                  prev ? { ...prev, days_ticket: e.target.value } : prev,
                )
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

      <Card className="mb-6">
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Informações do Cliente</h2>

          <div className="grid grid-cols-5 gap-4 mb-4">
            <div ref={dropdownRef} className="col-span-3 relative">
              <Input
                type="text"
                placeholder="Procurar Cliente..."
                value={searchCustomer}
                onFocus={() => setShowCustomers(true)}
                onChange={(e) => {
                  setSearchCustomer(e.target.value);
                  setShowCustomers(true);
                }}
              />

              {showCustomers && (
                <div className="absolute top-full left-0 z-50 mt-1 w-full border rounded-md shadow-md max-h-60 overflow-y-auto bg-background">
                  {customersFiltered.length > 0 ? (
                    customersFiltered.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-2 hover:bg-accent/60 transition-colors cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectCustomer(customer);
                        }}
                      >
                        {customer.fantasy_name || customer.name} -{" "}
                        {customer.document}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <Link href="/dashboard/customers/add" className="w-full">
                <Button variant="default" className="w-full">
                  Adicionar
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              value={selectedCustomer?.fantasy_name ?? ""}
              readOnly
              placeholder="Nome Fantasia"
              className="bg-muted"
            />
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
              value={selectedCustomer?.number ?? ""}
              readOnly
              placeholder="Número"
              className="bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Selecione os Produtos</h2>

          <div className="grid grid-cols-5 gap-4 items-center">
            <div className="col-span-3">
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productOpen}
                    className="w-full justify-between border rounded-md shadow-sm"
                  >
                    {selectedProduct
                      ? `${selectedProduct.code} - ${selectedProduct.name}`
                      : "Selecionar Produto"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar produto..."
                      value={productSearch}
                      onValueChange={setProductSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {filteredProducts.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.code} ${product.name}`}
                            onSelect={() => handleSelectNewProduct(product)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProduct?.id === product.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {product.code} - {product.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button className="col-span-2 w-full cursor-pointer" onClick={addItem}>
              Adicionar
            </Button>
          </div>

          <div className="flex w-full">
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                Estoque atual: {selectedProduct.stock} — Reservado:{" "}
                {reservedStock}
              </p>
            )}
          </div>

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
                          min={1}
                          step={1}
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
                          min={0}
                          step="0.01"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-4">
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

            <Select
              value={driverValue}
              onValueChange={(value) =>
                setSelectedDriverId(value === "none" ? null : value)
              }
            >
              <SelectTrigger
                className={`w-full ${
                  driverValue === "none" ? "text-muted-foreground" : ""
                }`}
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none">Selecione o Motorista</SelectItem>

                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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