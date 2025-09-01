"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Method = {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  default_days: number;
};

export default function PaymentMethodsManager() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<Method>>({
    name: "",
    code: "",
    enabled: true,
    default_days: 0,
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/payment-methods", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao buscar métodos");
      setMethods(data.methods);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        id: form.id,
        name: (form.name || "").trim(),
        code: (form.code || "").trim().toLowerCase().replace(/\s+/g, "-"),
        enabled: !!form.enabled,
        default_days: Number(form.default_days ?? 0),
      };
      const res = await fetch("/api/settings/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data?.error === "string" ? data.error : "Falha ao salvar",
        );
      toast.success("Método salvo!");
      setForm({ name: "", code: "", enabled: true, default_days: 0 });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este método?")) return;
    try {
      const res = await fetch("/api/settings/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Falha ao excluir");
      toast.success("Excluído!");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir");
    }
  }

  function edit(m: Method) {
    setForm(m);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formas de pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de criação/edição */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Nome</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex.: Boleto"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Código (slug)</Label>
            <Select
              value={form.code ?? ""}
              onValueChange={(v) => setForm((p) => ({ ...p, code: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione: pix, cartao, dinheiro, boleto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cartao">Cartao</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Prazo padrão (dias)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.default_days ?? 0}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  default_days: Number(e.target.value || 0),
                }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button onClick={save} disabled={saving} className="w-full">
              {form.id ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {methods.map((m) => (
              <div
                key={m.id}
                className="border rounded-xl p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{m.name}</div>

                  <span className="text-xs text-muted-foreground">
                    {" "}
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={async (v) => {
                        try {
                          const res = await fetch(
                            "/api/settings/payment-methods",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              cache: "no-store",
                              body: JSON.stringify({
                                ...m,
                                enabled: v,
                              }),
                            },
                          );
                          if (!res.ok) throw new Error("Falha ao atualizar");
                          toast.success(
                            v
                              ? `${m.name} habilitado!`
                              : `${m.name} desabilitado!`,
                          );
                          await load();
                        } catch (e: any) {
                          toast.error(e?.message ?? "Erro ao salvar");
                        }
                      }}
                    />
                  </span>
                </div>

                <div className="text-sm text-muted-foreground">
                  Prazo padrão: {m.default_days} dia(s)
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {m.enabled ? "Habilitado" : "Desabilitado"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /{m.code}
                  </span>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="secondary" onClick={() => edit(m)}>
                    Editar
                  </Button>
                  <Button variant="destructive" onClick={() => remove(m.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
