"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";

interface BankAccount {
  id: string;
  name: string;
  agency_name: string;
  account: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface ProductEntry {
  productId: string;
  quantity: number;
  unitPrice: number;
}

function toISODate(dateStr: string): string {
  const [dd, mm, yyyy] = dateStr.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

type Entry = {
  quantity?: number
  unitPrice?: number
  [key: string]: number | string | undefined
}

export default function AddFinancialRecord() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newEntries, setNewEntries] = useState<Entry[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [paymentDays, setPaymentDays] = useState<number | "">("");
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteType, setNoteType] = useState<"input" | "output">("input");
  const router = useRouter();

  const handleAddProduct = () => {
    setProductEntries([...productEntries, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveProduct = (index: number) => {
    setProductEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (
    index: number,
    field: keyof ProductEntry,
    value: string | number
  ) => {
    setProductEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
              ...entry,
              [field]: field === "quantity" || field === "unitPrice"
                ? Number(value)
                : value,
            }
          : entry
      )
    );
  };

  const totalAmount = selectedCategory === "product_purchase"
    ? productEntries.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    : amount;

  const handleSubmit = async () => {
    if (!issueDate || !dueDate || !paymentMethod) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const record = {
      company_id: companyId,
      issue_date: issueDate ? toISODate(issueDate) : new Date().toISOString().split("T")[0],
      due_date: dueDate ? toISODate(dueDate) : null,
      invoice_number: invoiceNumber,
      supplier: selectedSupplier,
      description,
      category: selectedCategory || customCategory || "others",
      amount: totalAmount,
      notes,
      status: "Unpaid",
      created_at: new Date().toISOString(),
      bank_account_id: selectedAccount || null,
      type: noteType,
    };

    setLoading(true);

    const { data: inserted, error } = await supabase
      .from("financial_records")
      .insert([record])
      .select()
      .maybeSingle();

    if (error || !inserted) {
      toast.error("Failed to create record: " + error?.message);
      setLoading(false);
      return;
    }

    if (selectedCategory === "product_purchase") {
      for (const entry of productEntries) {
        if (!entry.productId || entry.quantity <= 0 || entry.unitPrice <= 0) continue;

        const { error: stockError } = await supabase.from("stock").insert({
          company_id: companyId,
          product_id: entry.productId,
          quantity: entry.quantity,
          unit_price: entry.unitPrice,
          total_price: entry.quantity * entry.unitPrice,
          created_at: new Date().toISOString(),
          note_id: inserted.id,
        });

        if (stockError) {
          toast.error("Erro ao registrar estoque: " + stockError.message);
        }
      }
    }

    toast.success("Nota salva com sucesso!");
    setLoading(false);
    router.push("/dashboard/financial");
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name");
      if (!error) setSuppliers(data || []);
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!companyId) return;
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("company_id", companyId);
      if (!error) setProducts(data || []);
    };
    fetchProducts();
  }, [companyId]);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!companyId) return;
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, agency_name, account")
        .eq("company_id", companyId);
      if (!error) setBankAccounts(data || []);
    };
    fetchBankAccounts();
  }, [companyId]);

  useEffect(() => {
    const fetchCompanyId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setCompanyId(data.company_id);
      } else {
        console.error("Failed to load company ID:", error?.message);
      }
    };
    fetchCompanyId();
  }, []);

  const formatDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8); // remove tudo que não for número
    const parts = [];
  
    if (cleaned.length > 2) {
      parts.push(cleaned.slice(0, 2));
      if (cleaned.length > 4) {
        parts.push(cleaned.slice(2, 4));
        parts.push(cleaned.slice(4));
      } else {
        parts.push(cleaned.slice(2));
      }
    } else {
      parts.push(cleaned);
    }
  
    return parts.join("/");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
  <h1 className="text-2xl font-bold mb-4">Adicionar Nota</h1>

  <div className="grid grid-cols-2 gap-4 mt-4">
  <Select value={noteType} onValueChange={(val) => setNoteType(val as "input" | "output")}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Tipo de Nota" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="input">Nota de Entrada</SelectItem>
      <SelectItem value="output">Nota de Saída</SelectItem>
    </SelectContent>
  </Select>

  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione a categoria" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="compra_produto">Compra de Produto</SelectItem>
        <SelectItem value="pgto_funcionario">Pagamento Funcionário</SelectItem>
        <SelectItem value="vale_funcionario">Vale Funcionário</SelectItem>
        <SelectItem value="utilidades">Utilidades</SelectItem>
        <SelectItem value="aluguel">Aluguel</SelectItem>
        <SelectItem value="veiculo">Gastos com Veículos</SelectItem>
        <SelectItem value="outros">+ Personalizado</SelectItem>
      </SelectContent>
    </Select>

</div>


  {/* Banco + Datas + Número da nota */}
  <div className="grid grid-cols-4 gap-4 mt-4">
  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione a Conta Bancária" />
      </SelectTrigger>
      <SelectContent>
        {bankAccounts.map((acc) => (
          <SelectItem key={acc.id} value={acc.id}>
            {acc.name} - {acc.agency_name}/{acc.account}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Input placeholder="Numero da Nota (opcional)" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
    <Input placeholder="Data de Emissão" value={issueDate} onChange={(e) => setIssueDate(formatDate(e.target.value))} />
    <Input placeholder="Data de Vencimento" value={dueDate} onChange={(e) => setDueDate(formatDate(e.target.value))} />
  </div>



  {/* Categoria + Fornecedor */}
  <div className="grid grid-cols-4 gap-4 mt-4">
  {/* Fornecedor (metade da linha) */}
  <div className="col-span-2">
    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione um Fornecedor" />
      </SelectTrigger>
      <SelectContent>
        {suppliers.map((supplier) => (
          <SelectItem key={supplier.id} value={supplier.id}>
            {supplier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Método de Pagamento (1/4) */}
  <div className="col-span-1">
    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Método de pagamento" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
        <SelectItem value="PIX">Pix</SelectItem>
        <SelectItem value="CARTAO">Cartão</SelectItem>
        <SelectItem value="BOLETO">Boleto</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Dias para Pagar (1/4) – sempre visível, só habilitado com boleto */}
  <div className="col-span-1">
    <Input
      type="number"
      placeholder="Dias para Pagar"
      value={paymentDays}
      disabled={paymentMethod !== "BOLETO" && paymentMethod !== "CARTAO"}
      onChange={(e) => setPaymentDays(Number(e.target.value) || "")}
    />
  </div>
</div>

  {selectedCategory === "others" && (
    <Input
      placeholder="Digite uma Categoria Pesonalizada"
      value={customCategory}
      onChange={(e) => setCustomCategory(e.target.value)}
      className="mt-4"
    />
  )}

      {/* Tabela de Produtos */}
{selectedCategory === "product_purchase" && (
  <div className="mb-4 w-full">
    <h4 className="text-sm font-semibold mt-3">Produtos</h4>
    {productEntries.map((entry, index) => (
      <div key={index} className="flex flex-cols-4 gap-4 my-2 items-center justify-evenly">
        <Select
          value={entry.productId}
          onValueChange={(val) => handleProductChange(index, "productId", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Quantidade"
          value={entry.quantity}
          onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
        />
        <Input
          type="number"
          placeholder="Valor Unitário"
          value={entry.unitPrice}
          onChange={(e) => handleProductChange(index, "unitPrice", e.target.value)}
        />

        {/* Botão de remover */}
        <Button
          variant="destructive"
          size="icon"
          onClick={() => handleRemoveProduct(index)}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    ))}
    <Button variant="outline" onClick={handleAddProduct} className="mt-2">
      <Plus className="h-4 w-4 mr-2" /> Adicionar Produto
    </Button>
  </div>
)}

  {/* Pagamento + Valor */}
  <div className="grid grid-cols-2 gap-4 mt-4">

  <Input
    placeholder="Descrição"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />
    <Input
      placeholder="Valor Total"
      type="number"
      value={amount}
      onChange={(e) => setAmount(Number(e.target.value) || "")}
    />

  </div>

  {/* Notas */}
  <textarea
    placeholder="Notas (opcional)"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    className="mt-4 w-full h-32 p-2 border rounded-md resize-none"
  ></textarea>

  {/* Botão */}
  <Button className="mt-4 w-full" onClick={handleSubmit} disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? "Salvando..." : "Salvar Nota"}
  </Button>
</div>
  );
}
