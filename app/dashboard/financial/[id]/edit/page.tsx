"use client";

import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
// import Link from "next/link";

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
  price: number;
}

interface ProductEntry {
  productId: string;
  quantity: number;
  unitPrice: number;
}

function toISODate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`;
}

type Entry = {
  quantity?: number;
  unitPrice?: number;
  [key: string]: number | string | undefined;
};

export default function EditFinancialRecord() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  // const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // const [newEntries, setNewEntries] = useState<Entry[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
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
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteType, setNoteType] = useState<"input" | "output">("input");
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([]);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);

  const handleAddProduct = () => {
    setProductEntries([
      ...productEntries,
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

        // Quando mudar o produto selecionado
        if (field === "productId") {
          const selectedProduct = products.find((p) => p.id === value);
          return {
            ...entry,
            productId: value as string,
            unitPrice: selectedProduct?.price || 0, // aqui já puxa o preço
          };
        }

        // Atualiza normalmente se mudar quantidade ou unitPrice
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
    selectedCategory === "product_purchase"
      ? productEntries.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        )
      : amount;

  const handleSubmit = async () => {
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
      invoice_number: invoiceNumber,
      supplier: selectedSupplier,
      description,
      category: selectedCategory || customCategory || "others",
      amount: calculatedAmount,
      notes,
      status: "Unpaid",
      created_at: new Date().toISOString(),
      bank_account_id: selectedAccount || null,
      type: noteType,
      payment_method: paymentMethod,
    };

    setLoading(true);

    const { data: updated, error } = await supabase
      .from("financial_records")
      .update(record)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error || !updated) {
      toast.error("Erro ao salvar: " + (error?.message || "Erro desconhecido"));
      setLoading(false);
      return;
    }

    if (selectedCategory === "compra_produto") {
      for (const entry of productEntries) {
        if (!entry.productId || entry.quantity <= 0) continue;

        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", entry.productId)
          .maybeSingle();

        if (productError || !productData) {
          console.error("Erro buscando produto:", productError);
          continue;
        }

        const currentStock = Number(productData.stock) || 0;

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: currentStock + entry.quantity })
          .eq("id", entry.productId);

        if (updateError) {
          console.error("Erro atualizando estoque de produto:", updateError);
        }
      }

      const entriesToSave = productEntries.map((entry) => ({
        company_id: companyId,
        // note_id: inserted.id,
        product_id: entry.productId,
        quantity: entry.quantity,
        unit_price: entry.unitPrice,
      }));

      const { error: insertError } = await supabase
        .from("financial_products")
        .insert(entriesToSave);

      if (insertError) {
        console.error("Erro ao salvar produtos da nota:", insertError);
      }
    }

    if (selectedCategory === "compra_equipamento") {
      for (const entry of productEntries) {
        if (!entry.productId || entry.quantity <= 0) continue;

        const { data: equipmentData, error: equipmentError } = await supabase
          .from("equipments")
          .select("stock")
          .eq("id", entry.productId)
          .maybeSingle();

        if (equipmentError || !equipmentData) {
          console.error("Erro buscando equipamento:", equipmentError);
          continue;
        }

        const currentStock = Number(equipmentData.stock) || 0;

        const { error: updateError } = await supabase
          .from("equipments")
          .update({ stock: currentStock + entry.quantity })
          .eq("id", entry.productId);

        if (updateError) {
          console.error(
            "Erro atualizando estoque de equipamento:",
            updateError,
          );
        }
      }

      const entriesToSave = productEntries.map((entry) => ({
        financial_record_id: updated.id,
        equipment_id: entry.productId,
        quantity: entry.quantity,
        unit_price: entry.unitPrice,
      }));

      const { error: insertError } = await supabase
        .from("financial_equipments")
        .insert(entriesToSave);

      if (insertError) {
        console.error("Erro ao salvar equipamentos da nota:", insertError);
      }
    }

    toast.success("Nota salva com sucesso!");
    setLoading(false);
    router.push("/dashboard/financial");
  };

  useEffect(() => {
    const fetchEntities = async () => {
      const { data: suppliersData } = await supabase
        .from("suppliers")
        .select("id, name");
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name");
      if (suppliersData && customersData) {
        setEntities([
          ...suppliersData.map((s) => ({ id: s.id, name: s.name })),
          ...customersData.map((c) => ({ id: c.id, name: c.name })),
        ]);
      }
    };
    fetchEntities();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      if (!companyId) return;

      if (selectedCategory === "compra_produto") {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, standard_price");

        if (!error && data) {
          setProducts(
            data.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.standard_price,
            })),
          );
        }
      }

      if (selectedCategory === "compra_equipamento") {
        const { data, error } = await supabase
          .from("equipments")
          .select("id, name, value");

        if (!error && data) {
          setProducts(
            data.map((e) => ({
              id: e.id,
              name: e.name,
              price: e.value,
            })),
          );
        }
      }
    };

    fetchItems();
  }, [companyId, selectedCategory]);

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

  useEffect(() => {
    const fetchExistingRecord = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Erro ao carregar nota.");
        return;
      }

      // Preencher estados com os dados da nota
      setSelectedCategory(data.category);
      setSelectedSupplier(data.supplier);
      setPaymentMethod(data.payment_method);
      setAmount(data.amount);
      setDescription(data.description || "");
      setDueDate(data.due_date ? formatDate(data.due_date) : "");
      setIssueDate(data.issue_date ? formatDate(data.issue_date) : "");
      setInvoiceNumber(data.invoice_number || "");
      setNotes(data.notes || "");
      setSelectedAccount(data.bank_account_id || "");
      setNoteType(data.type);
      setPaymentDays(data.days_ticket || "");
    };

    fetchExistingRecord();
  }, [id]);

  useEffect(() => {
    const fetchProductEntries = async () => {
      if (!id || !selectedCategory) return;

      if (selectedCategory === "compra_produto") {
        const { data, error } = await supabase
          .from("financial_products")
          .select("product_id, quantity, unit_price")
          .eq("note_id", id);

        if (!error && data) {
          setProductEntries(
            data.map((item) => ({
              productId: item.product_id,
              quantity: item.quantity,
              unitPrice: item.unit_price,
            })),
          );
        }
      }

      if (selectedCategory === "compra_equipamento") {
        const { data, error } = await supabase
          .from("financial_equipments")
          .select("equipment_id, quantity, unit_price")
          .eq("financial_record_id", id);

        if (!error && data) {
          setProductEntries(
            data.map((item) => ({
              productId: item.equipment_id,
              quantity: item.quantity,
              unitPrice: item.unit_price,
            })),
          );
        }
      }
    };

    fetchProductEntries();
  }, [id, selectedCategory]);

  const formatDate = (value: string) => {
    if (!value) return "";

    // Verifica se está no formato ISO (yyyy-mm-dd)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yyyy, mm, dd] = value.split("-");
      return `${dd}/${mm}/${yyyy}`;
    }

    // Caso seja valor digitado manualmente
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
  };

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Nota</h1>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Select
          value={noteType}
          onValueChange={(val) => setNoteType(val as "input" | "output")}
        >
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
            <SelectItem value="compra_equipamento">
              Compra de Equipamento
            </SelectItem>
            <SelectItem value="pgto_funcionario">
              Pagamento Funcionário
            </SelectItem>
            <SelectItem value="vale_funcionario">Vale Funcionário</SelectItem>
            <SelectItem value="utilidades">Utilidades</SelectItem>
            <SelectItem value="aluguel">Aluguel</SelectItem>
            <SelectItem value="veiculo">Gastos com Veículos</SelectItem>
            <SelectItem value="outros">+ Outros</SelectItem>
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

      {/* Categoria + Fornecedor */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {/* Fornecedor (metade da linha) */}
        <div className="col-span-2">
          <div className="relative">
            <Input
              placeholder="Buscar Fornecedor ou Cliente..."
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setShowEntityDropdown(true); // 🔥 Abre o dropdown enquanto digita
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

        {/* Método de Pagamento (1/4) */}
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

        {/* Dias para Pagar (1/4) – sempre visível, só habilitado com boleto */}
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

      {/* Tabela de Produtos */}
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
            <Plus className="h-4 w-4 mr-2" /> Adicionar
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
          value={
            selectedCategory === "compra_produto" ||
            selectedCategory === "compra_equipamento"
              ? productEntries.reduce(
                  (sum, item) => sum + item.quantity * item.unitPrice,
                  0,
                )
              : amount
          }
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
        {loading ? "Salvando..." : "Atualizar Nota"}
      </Button>
    </div>
  );
}
