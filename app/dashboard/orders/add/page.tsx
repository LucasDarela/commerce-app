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
}

interface Product {
  id: number;
  code: string;
  name: string;
  standard_price: number;
  stock: number;
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
  const [appointment, setAppointment] = useState({
    date: undefined as Date | undefined,
    hour: "",
    location: "",
  });
  const [order, setOrder] = useState({
    customer_id: "",
    note_number: "",
    document_type: "internal",
    customer: "",
    standard_price: "",
    payment_method: "pix",
    days_ticket: "1",
  });
  const [loading, setLoading] = useState<boolean>(false);

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

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrder((prev) => ({ ...prev, customer_id: customer.id }));
    setSearchCustomer(customer.name);
    setShowCustomers(false);
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

  const getTotal = () => items.reduce((acc, item) => acc + item.standard_price * item.quantity, 0) + freight;

  const generateNoteNumber = (type: string) => {
    const timestamp = Date.now().toString().slice(-6);
    return type === "invoice" ? `${timestamp}` : `${timestamp}`;
  };

  const handleSubmit = async () => {
    if (!order.customer_id || items.length === 0) {
      toast.error("Select a customer and at least one product.");
      return;
    }

    setLoading(true);
    const newOrder = {
      customer_id: order.customer_id,
      note_number: order.note_number,
      document_type: order.document_type,
      payment_method: order.payment_method,
      payment_condition: order.payment_condition,
      days_ticket: order.payment_method === "boleto" ? parseInt(order.days_ticket) : null,
      total: getTotal(),
      freight,
      payed: false,
      delivery_status: "Pending",
      appointment_date: appointment.date ? format(appointment.date, "yyyy-MM-dd") : null,
      appointment_hour: appointment.hour,
      appointment_local: appointment.location,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("orders").insert([newOrder]);
    if (error) toast.error("Failed to create order.");
    else toast.success("Order created.");
    setLoading(false);
    router.push("/dashboard/orders");
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

  return (
    <div className="max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      <div className="grid grid-cols-3 gap-4">
        <h1 className="text-2xl font-bold mb-4">Create Order</h1>
      </div>
  
    {/* Select Document Type */}
    <Card className="mb-6">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-bold mb-4">Document Info</h2>
        <div className="flex flex-col-2 w-full h-auto gap-4">
          <Select
            onValueChange={(value) => {
              const generatedNoteNumber = generateNoteNumber(value);
              setOrder((prev) => ({ ...prev, document_type: value, note_number: generatedNoteNumber }));
            }}
          >
            <SelectTrigger className="border border-gray-300 rounded-md shadow-sm w-full">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent className="shadow-md rounded-md">
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Document Number"
            value={order.note_number}
            onChange={(e) => setOrder((prev) => ({ ...prev, note_number: e.target.value }))}
          />
        </div>

          {/* Customer Info */}
          <h2 className="text-xl font-bold mb-4">Customer Info</h2>
          <div className="grid grid-cols-5 gap-4">
          <div className="col-span-4 relative">
            <Input
              type="text"
              placeholder="Search Customer..."
              value={searchCustomer}
              onChange={(e) => {
                setSearchCustomer(e.target.value);
                setShowCustomers(true);
              }}
            />
            {showCustomers && customersFiltered.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-10 mt-1 w-full border border-gray-300 rounded-md shadow-md max-h-40 overflow-y-auto bg-muted"
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
              <Button variant="default" className="w-full">Add</Button>
            </Link>
          </div>

          {/* Display selected customer fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input value={selectedCustomer?.document ?? ""} readOnly placeholder="Document" className="bg-muted" />
            <Input value={selectedCustomer?.phone ?? ""} readOnly placeholder="Phone" className="bg-muted" />
            <Input value={selectedCustomer?.address ?? ""} readOnly placeholder="Address" className="bg-muted" />
            <Input value={selectedCustomer?.zip_code ?? ""} readOnly placeholder="Postal Code" className="bg-muted" />
            <Input value={selectedCustomer?.neighborhood ?? ""} readOnly placeholder="Neighborhood" className="bg-muted" />
            <Input value={selectedCustomer?.city ?? ""} readOnly placeholder="City" className="bg-muted" />
            <Input value={selectedCustomer?.state ?? ""} readOnly placeholder="State" className="bg-muted" />
            <Input value={selectedCustomer?.number ?? ""} readOnly placeholder="Number" className="bg-muted" />
          </div>
      </CardContent>
    </Card>
  
      {/* Products */}
      <Card className="mb-6">
        <CardContent className="space-y-4">
        <h2 className="text-xl font-bold mb-4">Select Products</h2>
          <div className="grid grid-cols-4 gap-4 items-center">
            <Select
              onValueChange={(value) => {
                const product = products.find((p) => p.id.toString() === value);
                if (product) {
                  setSelectedProduct(product);
                  setStandardPrice(typeof product.standard_price === "number" ? product.standard_price : 0);
                }
              }}
            >
              <SelectTrigger className="border border-gray-300 rounded-md shadow-sm w-full">
                <SelectValue placeholder="Select Product" />
              </SelectTrigger>
              <SelectContent className="shadow-md rounded-md z-50">
                {products.map((product) => (
                  <SelectItem
                    key={product.id}
                    value={product.id.toString()}
                    className="hover:bg-gray-100 cursor-pointer"
                  >
                    {product.code} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Quantity"
              value={quantity === 0 ? "" : quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <Input
              type="number"
              placeholder="Price"
              value={standardPrice ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setStandardPrice(value === "" ? "" : Number(value));
              }}
            />

            <Button
              onClick={() => {
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
              }}
              className="cursor-pointer"
            >
              Add
            </Button>
          </div>

          {/* Payment & Products Table */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Select
              value={order.payment_method}
              onValueChange={(value) => {
                setOrder((prev) => ({
                  ...prev,
                  payment_method: value,
                  days_ticket: value === "boleto" ? "12" : value === "cartao" ? "1" : prev.days_ticket,
                }));
              }}
            >
              <SelectTrigger className="w-full border border-gray-300 rounded-md shadow-sm">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent className="w-full shadow-md rounded-md">
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Days"
              value={order.days_ticket}
              onChange={(e) => setOrder((prev) => ({ ...prev, days_ticket: e.target.value }))}
              disabled={["pix", "cash"].includes(order.payment_method)}
              className={`w-full border border-gray-300 rounded-md shadow-sm ${["pix", "cash"].includes(order.payment_method) ? "cursor-not-allowed bg-gray-100 text-gray-500" : ""}`}
            />
          </div>

          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>R$ {item.standard_price?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Trash className="cursor-pointer text-red-500" onClick={() => removeItem(index)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
  
          {/* Appointment Info */}
          <div className="mt-20">
            <h2 className="text-xl font-bold mb-4">Delivery Appointment</h2>
            <div className="grid grid-cols-3 gap-4">
            <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full flex justify-between cursor-pointer hover:bg-gray-100">
                    {appointment.date ? format(appointment.date, "dd/MM/yyyy") : "Select Date"}
                    <CalendarIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[300px] shadow-lg rounded-md p-2 z-50 border border-gray-200" align="center" side="bottom">
                  <DatePicker
                    selected={appointment.date}
                    onChange={(date: Date | null) =>
                      setAppointment((prev) => ({ ...prev, date: date || undefined }))
                    }
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                placeholder="Hour"
                value={appointment.hour}
                onChange={(e) => setAppointment({ ...appointment, hour: e.target.value })}
              />

              <Input
                type="text"
                placeholder="Delivery Location"
                value={appointment.location}
                onChange={(e) => setAppointment({ ...appointment, location: e.target.value })}
              />
            </div>
          </div>
  
          <div className="grid grid-cols-3 gap-4 items-center">
          <Input
              type="number"
              placeholder="Freight"
              value={freight ?? ""}
              onChange={(e) => setFreight(Number(e.target.value) || 0)}
            />
            <div className="font-bold">Order Total: R$ {getTotal().toFixed(2)}</div>
            <Button variant="default" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Submit Order"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  };
