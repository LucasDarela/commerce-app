"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinancialPaymentModal } from "@/components/financial/PaymentModal";
import { ResetFinancialPaymentModal } from "@/components/financial/ResetPaymentModal";
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton";
import type { FinancialRecord } from "@/components/types/financial";
import type { CombinedRecord } from "@/components/financial/types";
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

type RecordItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

export default function FinancialRecordViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading: companyLoading } = useAuthenticatedCompany();

  const [record, setRecord] = useState<FinancialRecordView | null>(null);
  const [items, setItems] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isResetPaymentOpen, setIsResetPaymentOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        setItems([]);
      } else {
        const parsedData = data as unknown as FinancialRecordView;
        setRecord(parsedData);

        if (parsedData.category === "compra_produto") {
          const { data: fpData } = await supabase
            .from("financial_products")
            .select("product_id, quantity, unit_price")
            .eq("note_id", id);

          if (fpData && fpData.length > 0) {
            const pIds = fpData.map((f: any) => f.product_id);
            const { data: pData } = await supabase
              .from("products")
              .select("id, name")
              .in("id", pIds);

            const merged = fpData.map((f: any) => {
              const p = pData?.find(
                (x: any) => String(x.id) === String(f.product_id),
              );
              return {
                id: f.product_id,
                name: p?.name || "Produto Desconhecido",
                quantity: Number(f.quantity),
                unit_price: Number(f.unit_price),
              };
            });
            setItems(merged);
          } else {
            setItems([]);
          }
        } else if (parsedData.category === "compra_equipamento") {
          const { data: feData } = await supabase
            .from("financial_equipments")
            .select("equipment_id, quantity, unit_price")
            .eq("financial_record_id", id);

          if (feData && feData.length > 0) {
            const eIds = feData.map((f: any) => f.equipment_id);
            const { data: eData } = await supabase
              .from("equipments")
              .select("id, name")
              .in("id", eIds);

            const merged = feData.map((f: any) => {
              const e = eData?.find(
                (x: any) => String(x.id) === String(f.equipment_id),
              );
              return {
                id: f.equipment_id,
                name: e?.name || "Equipamento Desconhecido",
                quantity: Number(f.quantity),
                unit_price: Number(f.unit_price),
              };
            });
            setItems(merged);
          } else {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      }

      setLoading(false);
    };

    if (!companyLoading && companyId && id) {
      fetchRecord();
    }
  }, [id, companyId, companyLoading, supabase, refreshKey]);

  if (loading || companyLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!record || !companyId) {
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
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-bold">Espelho de Nota Financeira</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Fornecedor">{record.supplier || "-"}</Field>
          <Field label="Número da Nota">{record.invoice_number || "-"}</Field>
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
          <Field label="Conta Bancária">
            {record.bank_accounts?.name || "-"}
          </Field>
          <Field label="Descrição">{record.description || "-"}</Field>
        </div>

        {items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Itens da Nota</h2>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Produto / Equipamento</th>
                    <th className="p-3 font-medium text-right">Quantidade</th>
                    <th className="p-3 font-medium text-right">Valor Unit.</th>
                    <th className="p-3 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, idx) => (
                    <tr key={idx} className="bg-card hover:bg-muted/50">
                      <td className="p-3">{item.name}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Field label="Valor Total">{formatCurrency(amount)}</Field>
          <Field label="Valor Pago">{formatCurrency(totalPayed)}</Field>

          <Field label="Observações">{record.notes || "-"}</Field>
        </div>

        <div className="mt-8 flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/financial/${id}/edit`)}
          >
            Editar
          </Button>
          {record.status === "Paid" ? (
            <Button
              variant="outline"
              onClick={() => setIsResetPaymentOpen(true)}
            >
              Resetar Pagamento
            </Button>
          ) : (
            <Button variant="default" onClick={() => setIsPaymentOpen(true)}>
              Pagar
            </Button>
          )}
          <DeleteOrderButton
            id={record.id}
            companyId={companyId}
            table="financial_records"
            onDeleted={() => {
              router.push("/dashboard/financial");
            }}
          />
        </div>
      </div>

      <FinancialPaymentModal
        order={record as unknown as FinancialRecord}
        companyId={companyId}
        open={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => {
          setIsPaymentOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />

      <ResetFinancialPaymentModal
        order={{ ...record, source: "financial" } as unknown as CombinedRecord}
        open={isResetPaymentOpen}
        onClose={() => setIsResetPaymentOpen(false)}
        onSuccess={() => {
          setIsResetPaymentOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
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
