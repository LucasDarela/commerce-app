"use client";

import { useState, useEffect, useRef } from "react";
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
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {  Check, ChevronsUpDown, Trash, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { getReservedStock } from "@/lib/stock/getReservedStock";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateNextNoteNumber } from "@/lib/generate-next-note-number";
import { Textarea } from "@/components/ui/textarea";
import { orderSchema, type Order } from "@/components/types/orderSchema";
import React, { useMemo } from "react";
import { useOverdueCheck } from "@/components/billing/useOverdueCheck";
import { OverdueModal } from "@/components/billing/OverdueModal";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type OrderFormData = z.infer<typeof orderSchema> & { id?: string };

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
}

interface Product {
  id: string;
  code: string;
  name: string;
  standard_price: number;
  stock: number;
}

type LineItem = {
  id: string;
  name: string;
  quantity: number;
  standard_price: number;
};

type Driver = {
  id: string;
  name: string;
};

export default function AddOrder() {
  const router = useRouter();
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading: companyLoading } = useAuthenticatedCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [searchCustomer, setSearchCustomer] = useState<string>("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [standardPrice, setStandardPrice] = useState<number | "">("");
  const [freight, setFreight] = useState<number>(0);
  const [text_note, setTextNote] = useState<string>("");
  const [orderItems, setOrderItems] = useState<LineItem[]>([]);
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [catalogPrices, setCatalogPrices] = useState<Record<string, number>>(
    {},
  );
  const [reservedStock, setReservedStock] = useState<number>(0);
  const addCustomerUrl = `/dashboard/customers/add?redirect=/dashboard/orders/add&fromOrder=true`;
  const searchParams = useSearchParams();
  const newCustomerId = searchParams.get("newCustomerId");
  const [productOpen, setProductOpen] = useState(false);
const [productSearch, setProductSearch] = useState("");
  const { check, items: overdueItems, error: overdueError } = useOverdueCheck();
  const [appointment, setAppointment] = useState({
    date: undefined as Date | undefined,
    hour: "00:00",
    location: "",
  });
  const [order, setOrder] = useState<Partial<Order>>({
    issue_date: new Date().toISOString().split("T")[0],
    document_type: "internal",
  });

  const [first_name, ...rest] = selectedCustomer?.name?.split(" ") || [
    "Cliente",
  ];
  const last_name = rest.length > 0 ? rest.join(" ") : "Sobrenome";

  const issueDate = order?.issue_date ?? new Date().toISOString().split("T")[0];
  const daysTicket = Number(order?.days_ticket ?? 0);

  const dueDate = order?.due_date
    ? format(parseISO(order.due_date), "dd/MM/yyyy")
    : "";

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const driverValue = selectedDriverId ?? "none";

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

    setOrder((prev) => ({
      ...prev,
      due_date: due,
    }));
  }, [appointment.date, order?.payment_method, order?.days_ticket]);

  const [loading, setLoading] = useState<boolean>(false);
  const isSubmittingRef = useRef(false);

useEffect(() => {
  if (companyLoading) return;
  if (!companyId) {
    console.error("companyId não carregado no AddOrder");
    return;
  }

  const fetchData = async () => {
    const [{ data: customersData, error: customersError }, { data: productsData, error: productsError }] =
      await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .eq("company_id", companyId)
          .order("name", { ascending: true }),
        supabase
          .from("products")
          .select("id, code, name, standard_price, stock")
          .eq("company_id", companyId),
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
  };

  fetchData();
}, [companyId, companyLoading, supabase]);

  useEffect(() => {
    if (!companyId || order?.document_type !== "internal" || order.note_number)
      return;

    const prepareNote = async () => {
      const next = await generateNextNoteNumber(companyId);
      setOrder((prev) => ({ ...prev, note_number: next }));
    };

    prepareNote();
  }, [companyId, order?.document_type]);

useEffect(() => {
  const fetchDrivers = async () => {
    if (!companyId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email")
      .eq("company_id", companyId)
      .order("username", { ascending: true });

    if (error) {
      console.error("Erro ao buscar motoristas:", error);
      toast.error("Erro ao carregar motoristas.");
      return;
    }

    const mappedDrivers: Driver[] = (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.username || p.email || "Sem nome",
    }));

    setDrivers(mappedDrivers);
  };

  fetchDrivers();
}, [companyId, supabase]);

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrder((prev) => ({ ...prev, customer_id: customer.id }));
    setSearchCustomer(customer.name);
    setShowCustomers(false);

    const r = await check(customer.id, companyId);
    console.debug("[overdue-check][page] response:", r);
    if (overdueError) toast.error(overdueError);
    setOverdueOpen(!!r?.hasOverdue);

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
          pricesMap[String(item.product_id)] = item.price;
        });
        setCatalogPrices(pricesMap);
      }
    } else {
      setCatalogPrices({});
    }
  };

const addItem = () => {
  if (selectedProduct && standardPrice !== "") {
    console.log("selectedProduct before add:", selectedProduct);

    const newItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      quantity,
      standard_price: Number(standardPrice),
    };

    console.log("newItem being added:", newItem);

    setOrderItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setQuantity(1);
    setStandardPrice("");
  } else {
    toast.error("Selecione um produto e defina o preço.");
  }
};
  const removeItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    if (!product) return;
    setOrderItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        id: product.id,
        name: product.name,
        standard_price: product.standard_price,
      };
      return next;
    });
  };

  const handleEditQuantity = (index: number, quantity: string) => {
    setOrderItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: Number(quantity) || 0 };
      return next;
    });
  };

  const handleEditPrice = (index: number, price: string) => {
    setOrderItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], standard_price: Number(price) || 0 };
      return next;
    });
  };

  const getTotal = () =>
    orderItems.reduce(
      (acc, item) => acc + item.standard_price * item.quantity,
      0,
    ) + freight;

  const generateNoteNumber = (type: string) => {
    const timestamp = Date.now().toString().slice(-6);
    return type === "invoice" ? `${timestamp}` : `${timestamp}`;
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      if (!order || !order.customer_id || orderItems.length === 0) {
        toast.error("Selecione o cliente e pelomenos um produto.");
        isSubmittingRef.current = false;
        return;
      }

      if (!order.payment_method) {
        toast.error("Selecione uma forma de pagamento antes de continuar.");
        isSubmittingRef.current = false;
        return;
      }

      if (!appointment.date) {
        toast.error("Informe uma data de agendamento.");
        isSubmittingRef.current = false;
        return;
      }

      setLoading(true);

      const amount = orderItems.reduce((acc, item) => acc + item.quantity, 0);
      const productsDescription = orderItems
        .map((item) => `${item.name} (${item.quantity}x)`)
        .join(", ");
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
        payment_status: "Unpaid",
        days_ticket:
          capitalize(order?.payment_method || "") === "Boleto"
            ? order?.days_ticket || "10"
            : "1",
        total,
        freight,
        driver_id: selectedDriverId,
        delivery_status: "Entregar",
        appointment_date: appointment.date
          ? format(appointment.date, "yyyy-MM-dd")
          : null,
        appointment_hour: appointment.hour,
        appointment_local: appointment.location,
        company_id: companyId,
        created_at: new Date().toISOString(),
        issue_date: new Date().toISOString().split("T")[0],
        due_date:
          ["Pix", "Dinheiro", "Cartao"].includes(
            capitalize(order?.payment_method || ""),
          ) && appointment.date
            ? format(appointment.date, "yyyy-MM-dd")
            : appointment.date
              ? format(
                  new Date(
                    appointment.date.getTime() +
                      Number(order?.days_ticket || 12) * 24 * 60 * 60 * 1000,
                  ),
                  "yyyy-MM-dd",
                )
              : null,
        text_note,
      };

      const { data: insertedOrder, error } = await supabase
        .from("orders")
        .insert([{ ...newOrder, order_index: 0 }])
        .select()
        .single();

      if (error) {
        toast.error("❌ Falha ao criar ordem.");
        console.error("❌ Error inserting order:", error);
        setLoading(false);
        return;
      }

      console.log("orderItems before insert:", orderItems);

      const itemsPayload = orderItems.map((item) => ({
        order_id: insertedOrder.id,
        product_id: item.id ?? null,
        quantity: item.quantity,
        price: item.standard_price,
      }));

      console.log("itemsPayload before insert:", itemsPayload);

        const { data: insertedItems, error: itemError } = await supabase
          .from("order_items")
          .insert(itemsPayload)
          .select();  

        console.log("insertedItems:", insertedItems);

      if (itemError) {
        toast.error("❌ Ordem criada mas ERRO ao inserir itens.");
        console.error("❌ Error inserting order items:", itemError);
      } else {
        toast.success("🍻 Venda criada com sucesso!");
        router.push("/dashboard/orders");
      }
    } catch (err) {
      console.error("❌ Erro geral:", err);
      toast.error("Erro ao criar pedido.");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

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

const dropdownRef = useRef<HTMLDivElement>(null);

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
  const fetchReservedStock = async () => {
    if (!selectedProduct || !companyId) return;

    const reserved = await getReservedStock(selectedProduct.id, companyId);
    setReservedStock(reserved);
  };

  fetchReservedStock();
}, [selectedProduct, companyId]);

  useEffect(() => {
    const fetchNewCustomer = async () => {
      if (newCustomerId && companyId) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", newCustomerId)
          .eq("company_id", companyId)
          .single();

        if (error) {
          console.error("Erro ao buscar novo cliente:", error.message);
          toast.error("Não foi possível carregar o cliente recém-cadastrado.");
        } else if (data) {
          handleSelectCustomer(data);
          setSearchCustomer(data.name);
        }
      }
    };

    fetchNewCustomer();
  }, [newCustomerId, companyId]);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const productById = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    products.forEach((p) => m.set(String(p.id), p));
    return m;
  }, [products]);

  if (companyLoading) {
  return <div className="p-6">Carregando...</div>;
}

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Criar Venda</h1>
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

      {/* Customer Info */}
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
            {customer.fantasy_name || customer.name} - {customer.document}
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
              <Link href={addCustomerUrl} className="w-full">
                <Button variant="default" className="w-full">
                  Criar
                </Button>
              </Link>
            </div>
          </div>

          {/* Display selected customer fields */}
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

      {/* Products */}
      <Card className="mb-6">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Selecione os Produtos</h2>

          {/* Seção para Adicionar Novo Produto */}
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
                onSelect={() => {
                  setSelectedProduct(product);

                  const catalogPrice = catalogPrices[String(product.id)];
                  setStandardPrice(
                    typeof catalogPrice === "number"
                      ? catalogPrice
                      : product.standard_price,
                  );

                  setProductOpen(false);
                  setProductSearch("");
                }}
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
            <Button
              className="col-span-2 w-full cursor-pointer"
              onClick={addItem}
            >
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

      {/* Appointment Info */}
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
    className={`w-full ${driverValue === "none" ? "text-muted-foreground" : ""}`}
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
            <Button variant="default" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <OverdueModal
        open={overdueOpen}
        items={overdueItems}
        onClose={() => setOverdueOpen(false)}
        onProceed={() => {
          setOverdueOpen(false);
        }}
      />
    </div>
  );
}
