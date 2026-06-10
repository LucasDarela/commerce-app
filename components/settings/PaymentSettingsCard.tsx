"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Loader2, Plus, Trash2 } from "lucide-react";

export type PaymentSettings = {
  acceptedMethods: {
    pix: boolean;
    dinheiro: boolean;
    boleto: boolean;
    cartao: boolean;
  };
  boletoProfiles: {
    id: string;
    name: string;
    days: number[];
  }[];
};

export const defaultSettings: PaymentSettings = {
  acceptedMethods: {
    pix: true,
    dinheiro: true,
    boleto: true,
    cartao: true,
  },
  boletoProfiles: [
    { id: "1", name: "À Vista (Boleto)", days: [1] },
    { id: "2", name: "Boleto 5 dias", days: [5] },
    { id: "3", name: "Boleto 10 dias", days: [10] },
    { id: "4", name: "Boleto 7/14/21", days: [7, 14, 21] }
  ],
};

export default function PaymentSettingsCard() {
  const { companyId } = useAuthenticatedCompany();
  const supabase = createBrowserSupabaseClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);

  useEffect(() => {
    async function fetchSettings() {
      if (!companyId) return;
      
      const { data, error } = await supabase
        .from("companies")
        .select("payment_settings")
        .eq("id", companyId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar configurações de pagamento:", error);
        toast.error("Erro ao carregar configurações de pagamento.");
      } else if (data?.payment_settings) {
        // Merge with default settings to ensure all fields exist
        const fetchedSettings = data.payment_settings as Partial<PaymentSettings>;
        setSettings({
          acceptedMethods: { ...defaultSettings.acceptedMethods, ...fetchedSettings.acceptedMethods },
          boletoProfiles: fetchedSettings.boletoProfiles || defaultSettings.boletoProfiles,
        });
      }
      setLoading(false);
    }

    fetchSettings();
  }, [companyId, supabase]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("companies")
      .update({ payment_settings: settings })
      .eq("id", companyId);

    if (error) {
      console.error("Erro ao salvar configurações de pagamento:", error);
      toast.error("Erro ao salvar configurações.");
    } else {
      toast.success("Configurações de pagamento salvas!");
    }
    setSaving(false);
  };

  const handleMethodToggle = (method: keyof PaymentSettings["acceptedMethods"]) => {
    setSettings(prev => ({
      ...prev,
      acceptedMethods: {
        ...prev.acceptedMethods,
        [method]: !prev.acceptedMethods[method]
      }
    }));
  };

  const addProfile = () => {
    setSettings(prev => ({
      ...prev,
      boletoProfiles: [
        ...prev.boletoProfiles,
        { id: Date.now().toString(), name: "Nova Opção", days: [15] }
      ]
    }));
  };

  const removeProfile = (id: string) => {
    setSettings(prev => ({
      ...prev,
      boletoProfiles: prev.boletoProfiles.filter(p => p.id !== id)
    }));
  };

  const updateProfile = (id: string, field: "name" | "days", value: string) => {
    setSettings(prev => ({
      ...prev,
      boletoProfiles: prev.boletoProfiles.map(p => {
        if (p.id !== id) return p;
        
        if (field === "name") {
          return { ...p, name: value };
        } else {
          // Parse comma-separated numbers
          const days = value.split(",")
            .map(d => parseInt(d.trim()))
            .filter(d => !isNaN(d) && d > 0);
          return { ...p, days };
        }
      })
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métodos de Pagamento</CardTitle>
        <CardDescription>
          Configure quais formas de pagamento você aceita e regras de parcelamento.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Métodos Aceitos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="method-pix" 
                checked={settings.acceptedMethods.pix}
                onCheckedChange={() => handleMethodToggle("pix")}
              />
              <Label htmlFor="method-pix">Pix</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="method-boleto" 
                checked={settings.acceptedMethods.boleto}
                onCheckedChange={() => handleMethodToggle("boleto")}
              />
              <Label htmlFor="method-boleto">Boleto</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="method-cartao" 
                checked={settings.acceptedMethods.cartao}
                onCheckedChange={() => handleMethodToggle("cartao")}
              />
              <Label htmlFor="method-cartao">Cartão</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="method-dinheiro" 
                checked={settings.acceptedMethods.dinheiro}
                onCheckedChange={() => handleMethodToggle("dinheiro")}
              />
              <Label htmlFor="method-dinheiro">Dinheiro</Label>
            </div>
          </div>
        </div>

        {settings.acceptedMethods.boleto && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm text-muted-foreground">Opções Pré-Cadastradas de Boleto</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Crie os cartões de opções que aparecerão na hora de criar uma venda. Você pode definir boletos únicos (ex: 5 dias) ou parcelados (ex: 7, 14, 21).
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.boletoProfiles.map((profile, index) => (
                  <Card key={profile.id} className="relative overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <Input 
                        placeholder="Nome (Ex: Boleto 5 Dias)"
                        value={profile.name}
                        className="font-medium h-8"
                        onChange={(e) => updateProfile(profile.id, "name", e.target.value)}
                      />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Label className="text-xs text-muted-foreground mb-1 block">Dias para o vencimento</Label>
                      <Input 
                        placeholder="Ex: 5 ou 7, 14, 21"
                        value={profile.days.join(", ")}
                        className="h-8"
                        onChange={(e) => updateProfile(profile.id, "days", e.target.value)}
                      />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => removeProfile(profile.id)}
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ opacity: 1 }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="border-dashed flex items-center justify-center bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer min-h-[120px]" onClick={addProfile}>
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Plus className="h-6 w-6 mb-1" />
                    <span className="text-sm font-medium">Adicionar Opção</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
