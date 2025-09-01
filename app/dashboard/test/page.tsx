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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Trash, Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
// import { format, parseISO } from "date-fns";
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
import { addDays, format, parseISO } from "date-fns";
import { type Order as OrderDB } from "@/components/types/orderSchema";

type OrderFormData = z.infer<typeof orderSchema> & { id?: string };

type Method = {
  id: string;
  name: string;
  code: string;
  default_days?: number;
  enabled?: boolean;
};

type OrderDraft = Partial<OrderDB> & {
  payment_method?: string | null;
  days_ticket?: string | number;
};

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
  id: number;
  code: string;
  name: string;
  standard_price: number;
  stock: number;
}

// export async function generateNextNoteNumber(
//   companyId: string,
// ): Promise<string> {
//   const { data, error } = await supabase
//     .from("orders")
//     .select("note_number")
//     .eq("company_id", companyId)
//     .order("note_number", { ascending: false })
//     .limit(1);

//   if (error) {
//     console.error("Erro ao gerar número do pedido:", error);
//     return "1";
//   }

//   const lastNumber = data?.[0]?.note_number ? Number(data[0].note_number) : 0;
//   return String(lastNumber + 1);
// }

export default function AddOrder() {
  const router = useRouter();
  const { companyId } = useAuthenticatedCompany();
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
  const [items, setItems] = useState<any[]>([]);
  const [catalogPrices, setCatalogPrices] = useState<Record<string, number>>(
    {},
  );
  const [methods, setMethods] = useState<Method[]>([]);
  // const [noteNumber, setNoteNumber] = useState<string>("");
  const [reservedStock, setReservedStock] = useState<number>(0);
  const addCustomerUrl = `/dashboard/customers/add?redirect=/dashboard/orders/add&fromOrder=true`;
  const searchParams = useSearchParams();
  const newCustomerId = searchParams.get("newCustomerId");
  const [appointment, setAppointment] = useState({
    date: undefined as Date | undefined,
    hour: "00:00",
    location: "",
  });
  const [order, setOrder] = useState<OrderDraft>({
    issue_date: new Date().toISOString().split("T")[0],
    document_type: "internal",
  });

  // Converter issueDate para Date
  const dueDate = order?.due_date
    ? format(parseISO(order.due_date), "dd/MM/yyyy")
    : "";

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === order?.payment_method),
    [methods, order?.payment_method],
  );

  useEffect(() => {
    if (!appointment.date) {
      setOrder((prev) => ({ ...prev, due_date: undefined }));
      return;
    }

    const code = selectedMethod?.code?.toLowerCase(); // ex.: "pix", "dinheiro", "cartao", "boleto"
    const days = Number(order?.days_ticket ?? 0);

    const isImmediate = code
      ? ["pix", "dinheiro", "cartao"].includes(code)
      : false;
    const base = appointment.date;
    const dueDate = isImmediate ? base : addDays(base, days);

    setOrder((prev) => ({
      ...prev,
      due_date: format(dueDate, "yyyy-MM-dd"),
    }));
  }, [appointment.date, selectedMethod?.code, order?.days_ticket]);

  const [loading, setLoading] = useState<boolean>(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", companyId);
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

  useEffect(() => {
    if (companyId && !order.note_number) {
      (async () => {
        const nextNumber = await generateNextNoteNumber(companyId);
        setOrder((prev) => ({ ...prev, note_number: nextNumber }));
      })();
    }
  }, [companyId, order.note_number]);

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

  const getTotal = () =>
    items.reduce((acc, item) => acc + item.standard_price * item.quantity, 0) +
    freight;

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      if (!order || !order.customer_id || items.length === 0) {
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

      const amount = items.reduce((acc, item) => acc + item.quantity, 0);
      const productsDescription = items
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
        payment_method: order.payment_method,
        payment_method: selectedMethod?.name ?? "",
        payment_status: "Unpaid",
        days_ticket: String(order?.days_ticket ?? 0),
        total,
        freight,
        delivery_status: "Entregar",
        appointment_date: appointment.date
          ? format(appointment.date, "yyyy-MM-dd")
          : null,
        appointment_hour: appointment.hour,
        appointment_local: appointment.location,
        company_id: companyId,
        created_at: new Date().toISOString(),
        issue_date: new Date().toISOString().split("T")[0],
        due_date: order.due_date ?? null,
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

      console.log("Items antes de salvar order_items:", items);

      const orderItems = items.map((item) => ({
        order_id: insertedOrder.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.standard_price,
      }));

      const { error: itemError } = await supabase
        .from("order_items")
        .insert(orderItems);

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

  const customersFiltered = searchCustomer.trim()
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
          (customer.fantasy_name &&
            customer.fantasy_name
              .toLowerCase()
              .includes(searchCustomer.toLowerCase())) ||
          customer.document.includes(searchCustomer),
      )
    : [];

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
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
      if (!selectedProduct) return;

      const reserved = await getReservedStock(selectedProduct.id);
      const available = selectedProduct.stock - reserved;

      setReservedStock(reserved);
    };

    fetchReservedStock();
  }, [selectedProduct, quantity]);

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

  useEffect(() => {
    fetch("/api/settings/payment-methods", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMethods(d.methods?.filter((m: any) => m.enabled) ?? []))
      .catch(() => setMethods([]));
  }, []);

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

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md my-2">
      <h1 className="text-2xl font-bold mb-4">Criar Venda</h1>

      <h2 className="text-xl font-bold mb-4 mt-8">Informações do Documento</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        {/* Pedido */}
        <div className="space-y-1 lg:col-span-1">
          <label className="text-sm text-muted-foreground font-medium">
            Pedido
          </label>
          <Input
            type="text"
            placeholder="Número do Pedido"
            value={order?.note_number || ""}
            onChange={(e) =>
              setOrder((prev) => ({
                ...prev,
                note_number: e.target.value,
              }))
            }
            className="w-full"
          />
        </div>
        {/* Emissão */}
        <div className="space-y-1 lg:col-span-1">
          <label className="text-sm text-muted-foreground font-medium">
            Emissão
          </label>
          <Input
            id="issue_date"
            value={
              order?.issue_date
                ? format(new Date(order.issue_date), "dd/MM/yyyy")
                : ""
            }
            readOnly
            className="w-full cursor-not-allowed bg-muted"
          />
        </div>
        {/* Pagamento */}
        <div className="space-y-1 lg:col-span-1">
          <label className="text-sm text-muted-foreground font-medium">
            Pagamento
          </label>
          <Select
            value={order?.payment_method || ""}
            onValueChange={(id) => {
              const m = methods.find((x) => x.id === id);
              if (!m) return;
              setOrder((prev) => ({
                ...prev,
                payment_method: m.id,
                days_ticket: String(m.default_days ?? 0),
              }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o pagamento" />
            </SelectTrigger>
            <SelectContent>
              {methods.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prazo */}
        <div className="space-y-1 lg:col-span-1">
          <label className="text-sm text-muted-foreground font-medium">
            Prazo
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Prazo"
            value={order?.days_ticket || ""}
            onChange={(e) =>
              setOrder((prev) => ({ ...prev, days_ticket: e.target.value }))
            }
            disabled={["pix", "dinheiro", "cartao"].includes(
              (selectedMethod?.code || "").toLowerCase(),
            )}
            className="w-full disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        {/* Vencimento */}
        <div className="space-y-1 lg:col-span-1">
          <label className="text-sm text-muted-foreground font-medium">
            Vencimento
          </label>
          <Input
            id="due_date"
            value={dueDate}
            readOnly
            className="w-full cursor-not-allowed bg-muted"
          />
        </div>
      </div>

      {/* Customer Info */}
      <div className="my-10">
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
          <div className="col-span-2">
            <Link href={addCustomerUrl} className="w-full">
              <Button variant="default" className="w-full">
                Adicionar
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
      </div>
      {/* Products */}
      <div className="my-10">
        <h2 className="text-xl font-bold mb-4">Selecione os Produtos</h2>

        {/* Seção para Adicionar Novo Produto */}
        <div className="grid grid-cols-5 gap-4 items-center">
          <Select
            onValueChange={(value) => {
              const product = products.find((p) => p.id.toString() === value);
              if (product) {
                setSelectedProduct(product);
                const catalogPrice = catalogPrices[product.id];
                setStandardPrice(
                  typeof catalogPrice === "number"
                    ? catalogPrice
                    : product.standard_price,
                );
              }
            }}
          >
            <SelectTrigger className="border rounded-md shadow-sm w-full col-span-3 truncate ">
              <SelectValue placeholder="Selecionar Produto" />
            </SelectTrigger>
            <SelectContent className="shadow-md rounded-md z-50">
              {products
                .slice()
                .sort((a, b) => Number(a.code) - Number(b.code))
                .map((product) => (
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
              {items.map((item, index) => {
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
                        onChange={(e) => handleEditPrice(index, e.target.value)}
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
      </div>
      {/* Appointment Info */}

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
      <div className="my-10">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="text-center font-bold">
            Total: R$ {getTotal().toFixed(2)}
          </div>
          <Button variant="default" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
