"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader } from "lucide-react";

export default function FinancialRecordViewPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*, bank_accounts(name)")
        .eq("id", id)
        .single();

      if (!error) setRecord(data);
      setLoading(false);
    };

    if (id) fetchRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center text-muted-foreground">
        Registro não encontrado.
      </div>
    );
  }

  return (
    <div className="w-full p-9 mt-6 space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold mb-4">
            Espelho de Nota Financeira
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Fornecedor">{record.supplier}</Field>
          <Field label="Descrição">{record.description || "-"}</Field>
          <Field label="Categoria">{formatCategory(record.category)}</Field>
          <Field label="Tipo">
            {record.type === "input" ? "Nota de Entrada" : record.type}
          </Field>
          <Field label="Método de Pagamento">{record.payment_method}</Field>
          <Field label="Status">
            {record.status === "Paid" ? "Pago" : record.status}
          </Field>
          <Field label="Data de Emissão">{formatDate(record.issue_date)}</Field>
          <Field label="Data de Vencimento">
            {formatDate(record.due_date)}
          </Field>
          <Field label="Conta Bancária">
            {record.bank_accounts?.name || "-"}
          </Field>
          <Field label="Valor Total">{formatCurrency(record.amount)}</Field>
          <Field label="Valor Pago">{formatCurrency(record.amount)}</Field>
          <Field label="Número da Nota">{record.invoice_number || "-"}</Field>
          <Field label="Observações">{record.notes || "-"}</Field>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">
        {label}
      </Label>
      <Input value={children as string} readOnly className="bg-muted" />
    </div>
  );
}

function formatCategory(category: string | null) {
  if (!category) return "-";
  return category.replace(/_/g, " ").toUpperCase();
}
