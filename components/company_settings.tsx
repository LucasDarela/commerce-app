"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

type CompanyFormData = {
  document: string;
  corporate_name: string;
  trade_name: string;
  zip_code: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  phone: string;
  email: string;
  state_registration: string;
  regime_tributario: string;
};

const initialFormData: CompanyFormData = {
  document: "",
  corporate_name: "",
  trade_name: "",
  zip_code: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  number: "",
  complement: "",
  phone: "",
  email: "",
  state_registration: "",
  regime_tributario: "",
};

export default function CompanySettingsForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId } = useAuthenticatedCompany();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchingCompany, setFetchingCompany] = useState(true);

  const [logoUrl, setLogoUrl] = useState("/default-logo.png");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);

  useEffect(() => {
    let cancelled = false;

    const fetchCompany = async () => {
      if (!companyId) {
        setFetchingCompany(false);
        return;
      }

      setFetchingCompany(true);

      const { data, error } = await supabase
        .from("companies")
        .select(`
          document,
          corporate_name,
          trade_name,
          zip_code,
          address,
          neighborhood,
          city,
          state,
          number,
          complement,
          phone,
          email,
          state_registration,
          regime_tributario,
          logo_url
        `)
        .eq("id", companyId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Erro ao buscar dados da empresa:", error);
        toast.error("Erro ao buscar dados da empresa");
        setFetchingCompany(false);
        return;
      }

      if (data) {
        setFormData({
          document: data.document ?? "",
          corporate_name: data.corporate_name ?? "",
          trade_name: data.trade_name ?? "",
          zip_code: data.zip_code ?? "",
          address: data.address ?? "",
          neighborhood: data.neighborhood ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          number: data.number != null ? String(data.number) : "",
          complement: data.complement ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          state_registration: data.state_registration ?? "",
          regime_tributario:
            data.regime_tributario != null
              ? String(data.regime_tributario)
              : "",
        });

        if (data.logo_url) {
          setLogoUrl(data.logo_url);
        }
      }

      setFetchingCompany(false);
    };

    fetchCompany();

    return () => {
      cancelled = true;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [companyId, supabase]);

  const sanitizeDigits = (value: string) => value.replace(/\D/g, "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "document" || name === "zip_code"
          ? sanitizeDigits(value)
          : value,
    }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;

    setLogoFile(file);
    setLogoUrl(preview);
  };

  const handleCnpjSearch = async () => {
    const cnpj = sanitizeDigits(formData.document);

    if (cnpj.length !== 14) {
      toast.error("CNPJ deve conter 14 dígitos");
      return;
    }

    try {
      const res = await fetch(`/api/cnpj/${cnpj}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Erro ao buscar CNPJ");
      }

      setFormData((prev) => ({
        ...prev,
        document: cnpj,
        corporate_name: data.razao_social ?? "",
        trade_name: data.nome_fantasia ?? "",
        zip_code: sanitizeDigits(data.cep ?? ""),
        address: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.municipio ?? "",
        state: data.uf ?? "",
        number: data.numero ?? "",
      }));
    } catch (err) {
      console.error("Erro ao buscar dados do CNPJ:", err);
      toast.error("Erro ao buscar dados do CNPJ");
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !companyId) return null;

    const fileExt = logoFile.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(fileExt)
      ? fileExt
      : "png";

    const filePath = `${companyId}/logo.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("companylogos")
      .upload(filePath, logoFile, {
        upsert: true,
        contentType: logoFile.type || `image/${safeExt}`,
      });

    if (uploadError) {
      console.error("Erro ao fazer upload da logo:", uploadError);
      toast.error("Erro ao fazer upload da imagem.");
      return null;
    }

    const { data } = supabase.storage.from("companylogos").getPublicUrl(filePath);

    return data.publicUrl;
  };

  const toIntOrNull = (v: string) => {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  const normalizeOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };

  const handleSubmit = async () => {
    if (!companyId || loading) {
      if (!companyId) toast.error("Empresa não identificada.");
      return;
    }

    try {
      setLoading(true);

      let uploadedLogoUrl = logoUrl;

      if (logoFile) {
        const url = await handleLogoUpload();
        if (url) uploadedLogoUrl = url;
      }

      const payload = {
        document: normalizeOptionalText(sanitizeDigits(formData.document)),
        corporate_name: normalizeOptionalText(formData.corporate_name),
        trade_name: normalizeOptionalText(formData.trade_name),
        zip_code: normalizeOptionalText(sanitizeDigits(formData.zip_code)),
        address: normalizeOptionalText(formData.address),
        neighborhood: normalizeOptionalText(formData.neighborhood),
        city: normalizeOptionalText(formData.city),
        state: normalizeOptionalText(formData.state?.toUpperCase()),
        number: toIntOrNull(formData.number),
        complement: normalizeOptionalText(formData.complement),
        phone: normalizeOptionalText(formData.phone),
        email: normalizeOptionalText(formData.email?.toLowerCase()),
        state_registration: normalizeOptionalText(formData.state_registration),
        logo_url: uploadedLogoUrl || null,
        regime_tributario: normalizeOptionalText(formData.regime_tributario),
      };

      const { error } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", companyId);

      if (error) {
        console.error("Erro ao salvar empresa:", error);
        toast.error("Erro ao salvar empresa.");
        return;
      }

      toast.success("Dados da empresa atualizados com sucesso");
      setLogoFile(null);
      router.refresh();
    } catch (err) {
      console.error("Erro inesperado ao salvar empresa:", err);
      toast.error("Erro inesperado ao salvar empresa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-8">
      <h2 className="text-xl font-bold">Configure os dados da sua empresa</h2>

      <div className="mb-4">
        <Image
          src={logoUrl}
          alt="Logo da Empresa"
          width={120}
          height={120}
          className="rounded shadow border cursor-pointer hover:opacity-80 transition"
          onClick={handleImageClick}
        />
        <Label className="mt-2 text-sm text-muted-foreground">
          Clique para adicionar sua logo .png
        </Label>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2">CNPJ</Label>
          <div className="flex gap-2">
            <Input
              name="document"
              value={formData.document}
              onChange={handleChange}
              placeholder="Digite o CNPJ"
            />
            <Button
              type="button"
              onClick={handleCnpjSearch}
              disabled={loading || fetchingCompany}
            >
              Buscar
            </Button>
          </div>
        </div>

        <div>
          <Label className="mb-2">Nome Completo / Razão Social</Label>
          <Input
            name="corporate_name"
            value={formData.corporate_name}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Nome Fantasia</Label>
          <Input
            name="trade_name"
            value={formData.trade_name}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">CEP</Label>
          <Input
            name="zip_code"
            value={formData.zip_code}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Endereço</Label>
          <Input
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Bairro</Label>
          <Input
            name="neighborhood"
            value={formData.neighborhood}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Cidade</Label>
          <Input
            name="city"
            value={formData.city}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Estado</Label>
          <Input
            name="state"
            value={formData.state}
            onChange={handleChange}
            maxLength={2}
          />
        </div>

        <div>
          <Label className="mb-2">Número</Label>
          <Input
            name="number"
            value={formData.number}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Complemento</Label>
          <Input
            name="complement"
            value={formData.complement}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Telefone</Label>
          <Input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Email (Opcional)</Label>
          <Input
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">Inscrição Estadual</Label>
          <Input
            name="state_registration"
            value={formData.state_registration}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label className="mb-2">ID da Sua Empresa</Label>
          <PasswordInput value={companyId ?? ""} readOnly />
        </div>

        <div>
          <Label className="mb-2">Regime Tributário</Label>

          <Select
            value={formData.regime_tributario ?? ""}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, regime_tributario: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Regime tributário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Simples Nacional</SelectItem>
              <SelectItem value="2">
                Simples Nacional — excesso de sublimite
              </SelectItem>
              <SelectItem value="3">
                Regime Normal (Lucro Presumido / Lucro Real)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || fetchingCompany}
        className="mt-4"
      >
        {loading ? "Salvando..." : "Salvar Empresa"}
      </Button>
    </div>
  );
}