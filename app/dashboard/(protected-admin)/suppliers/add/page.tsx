"use client";

import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

function getDocumentType(document: string): "CPF" | "CNPJ" {
  const cleaned = document.replace(/\D/g, "");
  return cleaned.length === 11 ? "CPF" : "CNPJ";
}

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const phone = value.replace(/\D/g, "").slice(0, 11);

  return phone.length > 10
    ? phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    : phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

export default function AddSupplier() {
  const router = useRouter();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const { companyId } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(false);

  const [supplier, setSupplier] = useState({
    type: "CNPJ",
    document: "",
    name: "",
    fantasy_name: "",
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
  });

  const placeholders: Record<string, string> = {
    document: "CNPJ/CPF",
    name: "Razão Social / Nome Completo",
    fantasy_name: "Nome Fanstasia",
    zip_code: "CEP",
    address: "Endereço",
    neighborhood: "Bairro",
    city: "Cidade",
    state: "Estado",
    number: "Numero",
    complement: "Complemento",
    phone: "Telefone",
    email: "Email (Opcional)",
    state_registration: "Inscrição Estadual",
  };

  const formatUpper = (value: string, field: string) =>
    field === "email" ? value : value.toUpperCase();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;

    const formatted =
      name === "phone"
        ? formatPhone(rawValue)
        : name === "email"
          ? rawValue.trim()
          : name === "document" || name === "zip_code"
            ? sanitizeDigits(rawValue)
            : formatUpper(rawValue, name);

    setSupplier((prev) => {
      const next = { ...prev, [name]: formatted };

      if (name === "document") {
        const cleaned = sanitizeDigits(formatted);
        next.type = getDocumentType(cleaned);
      }

      return next;
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const fetchAddress = async () => {
    const cleanZip = sanitizeDigits(supplier.zip_code);

    if (cleanZip.length !== 8) return;

    try {
      const { data } = await axios.get(
        `https://viacep.com.br/ws/${cleanZip}/json/`,
      );

      if (data.erro) {
        toast.error("Invalid ZIP Code!");
        return;
      }

      setSupplier((prev) => ({
        ...prev,
        zip_code: cleanZip,
        address: formatUpper(data.logradouro || "", "address"),
        neighborhood: formatUpper(data.bairro || "", "neighborhood"),
        city: formatUpper(data.localidade || "", "city"),
        state: formatUpper(data.uf || "", "state"),
      }));
    } catch {
      toast.error("Failed to fetch address!");
    }
  };

  const fetchCNPJ = async () => {
    const cleanDoc = sanitizeDigits(supplier.document);

    if (cleanDoc.length !== 14) return;

    try {
      const { data } = await axios.get(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanDoc}`,
      );

      setSupplier((prev) => ({
        ...prev,
        type: "CNPJ",
        document: cleanDoc,
        name: formatUpper(data.razao_social || "", "name"),
        fantasy_name: formatUpper(data.nome_fantasia || "", "fantasy_name"),
        address: formatUpper(data.logradouro || "", "address"),
        neighborhood: formatUpper(data.bairro || "", "neighborhood"),
        city: formatUpper(data.municipio || "", "city"),
        state: formatUpper(data.uf || "", "state"),
        zip_code: sanitizeDigits(data.cep || ""),
        number: data.numero || "",
        complement: data.complemento || "",
        phone: data.telefone ? formatPhone(data.telefone) : "",
        email: data.email || "",
        state_registration: formatUpper(
          data.inscricao_estadual || "",
          "state_registration",
        ),
      }));
    } catch {
      toast.error("Failed to fetch CNPJ info");
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    const cleanedDocument = sanitizeDigits(supplier.document);
    const cleanedZipCode = sanitizeDigits(supplier.zip_code);
    const cleanedPhone = sanitizeDigits(supplier.phone);
    const documentType = getDocumentType(cleanedDocument);

    if (!supplier.name.trim() || !cleanedDocument) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (![11, 14].includes(cleanedDocument.length)) {
      toast.error("Documento inválido.");
      return;
    }

    if (cleanedZipCode && cleanedZipCode.length !== 8) {
      toast.error("CEP inválido.");
      return;
    }

    try {
      setLoading(true);

      const { data: existing, error: existingError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("document", cleanedDocument)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existingError) {
        toast.error("Erro ao validar fornecedor existente.");
        return;
      }

      if (existing) {
        toast.error("Supplier already exists.");
        return;
      }

      const payload = {
        type: documentType,
        document: cleanedDocument,
        name: supplier.name.trim().toUpperCase(),
        fantasy_name:
          documentType === "CNPJ"
            ? (supplier.fantasy_name?.trim().toUpperCase() ?? "")
            : "",
        zip_code: cleanedZipCode || "",
        address: supplier.address.trim().toUpperCase(),
        neighborhood: supplier.neighborhood.trim().toUpperCase(),
        city: supplier.city.trim().toUpperCase(),
        state: supplier.state.trim().toUpperCase(),
        number: supplier.number.trim(),
        complement: supplier.complement.trim(),
        phone: cleanedPhone,
        email: supplier.email.trim().toLowerCase(),
        state_registration:
          documentType === "CNPJ"
            ? (supplier.state_registration?.trim().toUpperCase() ?? "")
            : "",
        company_id: companyId,
      };

      const { error } = await supabase.from("suppliers").insert([payload]);

      if (error) {
        toast.error("Error creating supplier: " + error.message);
        return;
      }

      toast.success("Supplier successfully created!");
      router.push("/dashboard/suppliers");
    } catch (error) {
      console.error("AddSupplier.handleSubmit", error);
      toast.error("Erro inesperado ao salvar fornecedor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
      <div className="flex gap-2 items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Adicionar Fornecedor</h1>
      </div>

      {Object.keys(placeholders).map((field, index) => {
        if (
          supplier.type === "CPF" &&
          ["fantasy_name", "state_registration"].includes(field)
        ) {
          return null;
        }

        return (
          <Input
            key={field}
            name={field}
            placeholder={placeholders[field]}
            type={field === "email" ? "email" : "text"}
            value={supplier[field as keyof typeof supplier]}
            onChange={handleChange}
            onBlur={
              field === "zip_code"
                ? fetchAddress
                : field === "document" && supplier.type === "CNPJ"
                  ? fetchCNPJ
                  : undefined
            }
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            className="mt-2"
          />
        );
      })}

      <Button
        className="mt-4 w-full"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}