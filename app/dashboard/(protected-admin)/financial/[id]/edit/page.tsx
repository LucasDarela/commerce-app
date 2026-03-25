"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Plus, Trash } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface BankAccount {
  id: string;
  name: string;
  agency_name: string;
  account: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface ProductEntry {
  productId: string;
  quantity: number;
  unitPrice: number;
}

type NoteType = "input" | "output";
type CategoryType =
  | "compra_produto"
  | "compra_equipamento"
  | "pgto_funcionario"
  | "vale_funcionario"
  | "combustivel"
  | "veiculo"
  | "aluguel"
  | "contabilidade"
  | "utilidades"
  | "others"
  | "";

type ExistingFinancialRecord = {
  id: string;
  company_id: string;
  category: string | null;
  supplier: string | null;
  payment_method: string | null;
  amount: number | null;
  description: string | null;
  due_date: string | null;
  issue_date: string | null;
  invoice_number: string | null;
  notes: string | null;
  bank_account_id: string | null;
  type: NoteType;
  days_ticket?: number | null;
};

function toISODate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(value: string) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  const cleaned = value.replace(/\D/g, "").slice(0, 8);
  const parts = [];

  if (cleaned.length >= 2) {
    parts.push(cleaned.slice(0, 2));
    if (cleaned.length >= 4) {
      parts.push(cleaned.slice(2, 4));
      parts.push(cleaned.slice(4, 8));
    } else {
      parts.push(cleaned.slice(2));
    }
  } else {
    parts.push(cleaned);
  }

  return parts.join("/");
}

export default function EditFinancialRecord() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading: authLoading } = useAuthenticatedCompany();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const [paymentDays, setPaymentDays] = useState<number | "">("");
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [noteType, setNoteType] = useState<"input" | "output">("input");
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([]);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [existingRecord, setExistingRecord] =
    useState<ExistingFinancialRecord | null>(null);

  const handleAddProduct = () => {
    setProductEntries((prev) => [
      ...prev,
      { productId: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setProductEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (
    index: number,
    field: keyof ProductEntry,
    value: string | number,
  ) => {
    setProductEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;

        if (field === "productId") {
          const selectedProduct = products.find((p) => p.id === value);
          return {
            ...entry,
            productId: value as string,
            unitPrice: selectedProduct?.price || 0,
          };
        }

        return {
          ...entry,
          [field]:
            field === "quantity" || field === "unitPrice"
              ? Number(value)
              : value,
        };
      }),
    );
  };

  const totalAmount =
    selectedCategory === "compra_produto" ||
    selectedCategory === "compra_equipamento"
      ? productEntries.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        )
      : amount;

  async function restorePreviousStock() {
    if (!existingRecord || !companyId) return;

    if (existingRecord.category === "compra_produto") {
      const { data, error } = await supabase
        .from("financial_products")
        .select("product_id, quantity")
        .eq("note_id", existingRecord.id)
        .eq("company_id", companyId);

      if (error) {
        throw new Error("Erro ao buscar produtos antigos da nota.");
      }

      for (const item of data ?? []) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (productError || !product) continue;

        const currentStock = Number(product.stock ?? 0);
        const restoredStock = Math.max(currentStock - Number(item.quantity || 0), 0);

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: restoredStock })
          .eq("id", item.product_id)
          .eq("company_id", companyId);

        if (updateError) {
          throw new Error("Erro ao restaurar estoque anterior dos produtos.");
        }
      }

      const { error: deleteError } = await supabase
        .from("financial_products")
        .delete()
        .eq("note_id", existingRecord.id)
        .eq("company_id", companyId);

      if (deleteError) {
        throw new Error("Erro ao limpar produtos antigos da nota.");
      }
    }

    if (existingRecord.category === "compra_equipamento") {
      const { data, error } = await supabase
        .from("financial_equipments")
        .select("equipment_id, quantity")
        .eq("financial_record_id", existingRecord.id)
        .eq("company_id", companyId);

      if (error) {
        throw new Error("Erro ao buscar equipamentos antigos da nota.");
      }

      for (const item of data ?? []) {
        const { data: equipment, error: equipmentError } = await supabase
          .from("equipments")
          .select("stock")
          .eq("id", item.equipment_id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (equipmentError || !equipment) continue;

        const currentStock = Number(equipment.stock ?? 0);
        const restoredStock = Math.max(currentStock - Number(item.quantity || 0), 0);

        const { error: updateError } = await supabase
          .from("equipments")
          .update({ stock: restoredStock })
          .eq("id", item.equipment_id)
          .eq("company_id", companyId);

        if (updateError) {
          throw new Error("Erro ao restaurar estoque anterior dos equipamentos.");
        }
      }

      const { error: deleteError } = await supabase
        .from("financial_equipments")
        .delete()
        .eq("financial_record_id", existingRecord.id)
        .eq("company_id", companyId);

      if (deleteError) {
        throw new Error("Erro ao limpar equipamentos antigos da nota.");
      }
    }
  }

  async function applyNewStockAndItems(updatedId: string) {
    if (!companyId) return;

    if (selectedCategory === "compra_produto") {
      for (const entry of productEntries) {
        if (!entry.productId || entry.quantity <= 0) continue;

        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", entry.productId)
          .eq("company_id", companyId)
          .maybeSingle();

        if (productError || !productData) {
          throw new Error("Erro ao buscar produto para atualizar estoque.");
        }

        const currentStock = Number(productData.stock ?? 0);

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: currentStock + entry.quantity })
          .eq("id", entry.productId)
          .eq("company_id", companyId);

        if (updateError) {
          throw new Error("Erro ao atualizar estoque de produto.");
        }
      }

      const entriesToSave = productEntries
        .filter((entry) => entry.productId && entry.quantity > 0)
        .map((entry) => ({
          company_id: companyId,
          note_id: updatedId,
          product_id: entry.productId,
          quantity: entry.quantity,
          unit_price: entry.unitPrice,
        }));

      if (entriesToSave.length > 0) {
        const { error: insertError } = await supabase
          .from("financial_products")
          .insert(entriesToSave);

        if (insertError) {
          throw new Error("Erro ao salvar produtos da nota.");
        }
      }
    }

    if (selectedCategory === "compra_equipamento") {
      for (const entry of productEntries) {
        if (!entry.productId || entry.quantity <= 0) continue;

        const { data: equipmentData, error: equipmentError } = await supabase
          .from("equipments")
          .select("stock")
          .eq("id", entry.productId)
          .eq("company_id", companyId)
          .maybeSingle();

        if (equipmentError || !equipmentData) {
          throw new Error("Erro ao buscar equipamento para atualizar estoque.");
        }

        const currentStock = Number(equipmentData.stock ?? 0);

        const { error: updateError } = await supabase
          .from("equipments")
          .update({ stock: currentStock + entry.quantity })
          .eq("id", entry.productId)
          .eq("company_id", companyId);

        if (updateError) {
          throw new Error("Erro ao atualizar estoque de equipamento.");
        }
      }

      const entriesToSave = productEntries
        .filter((entry) => entry.productId && entry.quantity > 0)
        .map((entry) => ({
          company_id: companyId,
          financial_record_id: updatedId,
          equipment_id: entry.productId,
          quantity: entry.quantity,
          unit_price: entry.unitPrice,
        }));

      if (entriesToSave.length > 0) {
        const { error: insertError } = await supabase
          .from("financial_equipments")
          .insert(entriesToSave);

        if (insertError) {
          throw new Error("Erro ao salvar equipamentos da nota.");
        }
      }
    }
  }

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!issueDate || !dueDate || !paymentMethod) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    let calculatedAmount = 0;

    if (
      selectedCategory === "compra_produto" ||
      selectedCategory === "compra_equipamento"
    ) {
      calculatedAmount = productEntries.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
    } else {
      calculatedAmount = Number(amount) || 0;
    }

    const record = {
      company_id: companyId,
      issue_date: issueDate
        ? toISODate(issueDate)
        : new Date().toISOString().split("T")[0],
      due_date: dueDate ? toISODate(dueDate) : null,
      invoice_number: invoiceNumber || null,
      supplier: selectedSupplier || null,
      description: description || null,
      category: selectedCategory || customCategory || "others",
      amount: calculatedAmount,
      notes: notes || null,
      bank_account_id: selectedAccount || null,
      type: noteType,
      payment_method: paymentMethod,
      days_ticket:
        paymentMethod === "Boleto" || paymentMethod === "Cartao"
          ? Number(paymentDays || 0)
          : null,
    };

    setLoading(true);

    try {
      await restorePreviousStock();

      const { data: updated, error } = await supabase
        .from("financial_records")
        .update(record)
        .eq("id", id)
        .eq("company_id", companyId)
        .select("id")
        .maybeSingle();

      if (error || !updated) {
        throw new Error(error?.message || "Erro desconhecido ao atualizar nota.");
      }

      await applyNewStockAndItems(updated.id);

      toast.success("Nota atualizada com sucesso!");
      router.push("/dashboard/financial");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar a nota.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEntities = async () => {
      if (!companyId) return;

      const [{ data: suppliersData }, { data: customersData }] = await Promise.all([
        supabase.from("suppliers").select("id, name").eq("company_id", companyId),
        supabase.from("customers").select("id, name").eq("company_id", companyId),
      ]);

      setEntities([
        ...(suppliersData ?? []).map((s) => ({ id: s.id, name: s.name })),
        ...(customersData ?? []).map((c) => ({ id: c.id, name: c.name })),
      ]);
    };

    fetchEntities();
  }, [companyId, supabase]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!companyId) return;

      if (selectedCategory === "compra_produto") {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, standard_price")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (!error && data) {
          setProducts(
            data.map((p) => ({
              id: String(p.id),
              name: p.name,
              price: Number(p.standard_price ?? 0),
            })),
          );
        }
      }

      if (selectedCategory === "compra_equipamento") {
        const { data, error } = await supabase
          .from("equipments")
          .select("id, name, value")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (!error && data) {
          setProducts(
            data.map((e) => ({
              id: String(e.id),
              name: e.name,
              price: Number(e.value ?? 0),
            })),
          );
        }
      }
    };

    fetchItems();
  }, [companyId, selectedCategory, supabase]);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!companyId) return;

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, agency_name, account")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (!error) setBankAccounts(data || []);
    };

    fetchBankAccounts();
  }, [companyId, supabase]);

  useEffect(() => {
    const fetchExistingRecord = async () => {
      if (!id || !companyId) return;

      setPageLoading(true);

      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (error || !data) {
        toast.error("Erro ao carregar nota.");
        setPageLoading(false);
        return;
      }

      const parsed = data as ExistingFinancialRecord;

      setExistingRecord(parsed);
      setSelectedCategory((parsed.category as CategoryType) || "");
      setSelectedSupplier(parsed.supplier || "");
      setPaymentMethod(parsed.payment_method || "Pix");
      setAmount(Number(parsed.amount ?? 0));
      setDescription(parsed.description || "");
      setDueDate(parsed.due_date ? formatDate(parsed.due_date) : "");
      setIssueDate(parsed.issue_date ? formatDate(parsed.issue_date) : "");
      setInvoiceNumber(parsed.invoice_number || "");
      setNotes(parsed.notes || "");
      setSelectedAccount(parsed.bank_account_id || "");
      setNoteType(parsed.type || "input");
      setPaymentDays(parsed.days_ticket || "");

      setPageLoading(false);
    };

    fetchExistingRecord();
  }, [id, companyId, supabase]);

  useEffect(() => {
    const fetchProductEntries = async () => {
      if (!id || !companyId || !selectedCategory) return;

      if (selectedCategory === "compra_produto") {
        const { data, error } = await supabase
          .from("financial_products")
          .select("product_id, quantity, unit_price")
          .eq("note_id", id)
          .eq("company_id", companyId);

        if (!error && data) {
          setProductEntries(
            data.map((item) => ({
              productId: String(item.product_id),
              quantity: Number(item.quantity ?? 0),
              unitPrice: Number(item.unit_price ?? 0),
            })),
          );
        }
      }

      if (selectedCategory === "compra_equipamento") {
        const { data, error } = await supabase
          .from("financial_equipments")
          .select("equipment_id, quantity, unit_price")
          .eq("financial_record_id", id)
          .eq("company_id", companyId);

        if (!error && data) {
          setProductEntries(
            data.map((item) => ({
              productId: String(item.equipment_id),
              quantity: Number(item.quantity ?? 0),
              unitPrice: Number(item.unit_price ?? 0),
            })),
          );
        }
      }
    };

    fetchProductEntries();
  }, [id, companyId, selectedCategory, supabase]);

  if (authLoading || pageLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Nota</h1>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Select
          value={noteType}
          onValueChange={(val) => setNoteType(val as NoteType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo de Nota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="input">Nota de Entrada</SelectItem>
            <SelectItem value="output">Nota de Saída</SelectItem>
          </SelectContent>
        </Select>

        <Select
          disabled
          value={selectedCategory}
          onValueChange={(val) => setSelectedCategory(val as CategoryType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compra_produto">Compra de Produto</SelectItem>
            <SelectItem value="compra_equipamento">
              Compra de Equipamento
            </SelectItem>
            <SelectItem value="pgto_funcionario">
              Pagamento Funcionário
            </SelectItem>
            <SelectItem value="vale_funcionario">Vale Funcionário</SelectItem>
            <SelectItem value="combustivel">Combustível</SelectItem>
            <SelectItem value="veiculo">Gastos com Veículos</SelectItem>
            <SelectItem value="aluguel">Aluguel</SelectItem>
            <SelectItem value="contabilidade">Contabilidade</SelectItem>
            <SelectItem value="utilidades">Utilidades</SelectItem>
            <SelectItem value="others">+ Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

        <Input
          placeholder="Numero da Nota (opcional)"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />

        <Input
          placeholder="Data de Emissão"
          value={issueDate}
          onChange={(e) => setIssueDate(formatDate(e.target.value))}
        />

        <Input
          placeholder="Data de Vencimento"
          value={dueDate}
          onChange={(e) => setDueDate(formatDate(e.target.value))}
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="col-span-2">
          <div className="relative">
            <Input
              placeholder="Buscar Fornecedor ou Cliente..."
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setShowEntityDropdown(true);
              }}
              className="w-full"
            />

            {showEntityDropdown && selectedSupplier.length > 0 && (
              <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md max-h-40 overflow-y-auto bg-muted">
                {entities
                  .filter((entity) =>
                    entity.name
                      .toLowerCase()
                      .includes(selectedSupplier.toLowerCase()),
                  )
                  .map((entity) => (
                    <div
                      key={entity.id}
                      className="p-2 cursor-pointer"
                      onClick={() => {
                        setSelectedSupplier(entity.name);
                        setShowEntityDropdown(false);
                      }}
                    >
                      {entity.name}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1">
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Método de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="Pix">Pix</SelectItem>
              <SelectItem value="Cartao">Cartão</SelectItem>
              <SelectItem value="Boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-1">
          <Input
            type="number"
            placeholder="Dias para Pagar"
            value={paymentDays}
            disabled={paymentMethod !== "Boleto" && paymentMethod !== "Cartao"}
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

      {(selectedCategory === "compra_produto" ||
        selectedCategory === "compra_equipamento") && (
        <div className="mb-4 w-full">
          <h4 className="text-sm font-semibold mt-3">
            {selectedCategory === "compra_produto"
              ? "Produtos"
              : "Equipamentos"}
          </h4>

          {productEntries.map((entry, index) => (
            <div
              key={index}
              className="flex flex-cols-4 gap-4 my-2 items-center justify-evenly"
            >
              <Select
                value={entry.productId}
                onValueChange={(val) =>
                  handleProductChange(index, "productId", val)
                }
              >
                <SelectTrigger className="w-[350px]">
                  <SelectValue placeholder="Produto ou Equipamento" />
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
                onChange={(e) =>
                  handleProductChange(index, "quantity", e.target.value)
                }
              />

              <Input
                type="number"
                placeholder="Valor Unitário"
                value={entry.unitPrice}
                onChange={(e) =>
                  handleProductChange(index, "unitPrice", e.target.value)
                }
              />

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
            <Plus className="h-4 w-4 mr-2" /> Adicionar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Input
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          placeholder="Valor Total"
          type="number"
          value={totalAmount}
          onChange={(e) => {
            if (
              selectedCategory !== "compra_produto" &&
              selectedCategory !== "compra_equipamento"
            ) {
              setAmount(Number(e.target.value) || "");
            }
          }}
          disabled={
            selectedCategory === "compra_produto" ||
            selectedCategory === "compra_equipamento"
          }
        />
      </div>

      <textarea
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mt-4 w-full h-32 p-2 border rounded-md resize-none"
      />

      <Button className="mt-4 w-full" onClick={handleSubmit} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? "Salvando..." : "Atualizar Nota"}
      </Button>
    </div>
  );
}