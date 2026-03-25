"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

type FinancialRecordView = {
  id: string;
  supplier: string | null;
  description: string | null;
  category: string | null;
  type: string | null;
  payment_method: string | null;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount: number | null;
  total_payed?: number | null;
  invoice_number: string | null;
  notes: string | null;
  bank_accounts?: {
    name: string | null;
  } | null;
};

export default function FinancialRecordViewPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading: companyLoading } = useAuthenticatedCompany();

  const [record, setRecord] = useState<FinancialRecordView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!id || !companyId) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("financial_records")
        .select(
          `
            id,
            supplier,
            description,
            category,
            type,
            payment_method,
            status,
            issue_date,
            due_date,
            amount,
            total_payed,
            invoice_number,
            notes,
            bank_accounts(name)
          `,
        )
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar registro financeiro:", error);
        setRecord(null);
      } else {
        setRecord((data as FinancialRecordView | null) ?? null);
      }

      setLoading(false);
    };

    if (!companyLoading && companyId && id) {
      fetchRecord();
    }
  }, [id, companyId, companyLoading, supabase]);

  if (loading || companyLoading) {
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

  const amount = Number(record.amount ?? 0);
  const totalPayed = Number(record.total_payed ?? record.amount ?? 0);

  return (
    <div className="w-full p-9 mt-6 space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold mb-4">
            Espelho de Nota Financeira
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Fornecedor">{record.supplier || "-"}</Field>
          <Field label="Descrição">{record.description || "-"}</Field>
          <Field label="Categoria">{formatCategory(record.category)}</Field>
          <Field label="Tipo">
            {record.type === "input" ? "Nota de Entrada" : record.type || "-"}
          </Field>
          <Field label="Método de Pagamento">
            {record.payment_method || "-"}
          </Field>
          <Field label="Status">
            {record.status === "Paid" ? "Pago" : record.status || "-"}
          </Field>
          <Field label="Data de Emissão">
            {record.issue_date ? formatDate(record.issue_date) : "-"}
          </Field>
          <Field label="Data de Vencimento">
            {record.due_date ? formatDate(record.due_date) : "-"}
          </Field>
          <Field label="Conta Bancária">{record.bank_accounts?.name || "-"}</Field>
          <Field label="Valor Total">{formatCurrency(amount)}</Field>
          <Field label="Valor Pago">{formatCurrency(totalPayed)}</Field>
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
      <Input value={String(children ?? "")} readOnly className="bg-muted" />
    </div>
  );
}

function formatCategory(category: string | null) {
  if (!category) return "-";
  return category.replace(/_/g, " ").toUpperCase();
}