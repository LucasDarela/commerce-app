"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

function getDocumentType(document: string): "CPF" | "CNPJ" {
  const cleaned = document.replace(/\D/g, ""); // Remove pontos, traços, etc.
  return cleaned.length === 11 ? "CPF" : "CNPJ";
}

export default function AddSupplier() {
  const router = useRouter();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const { companyId } = useAuthenticatedCompany();

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
          : formatUpper(rawValue, name);

    setSupplier((prev) => ({ ...prev, [name]: formatted }));
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
    if (!supplier.zip_code || supplier.zip_code.length !== 8) return;
    try {
      const { data } = await axios.get(
        `https://viacep.com.br/ws/${supplier.zip_code}/json/`,
      );
      if (data.erro) {
        toast.error("Invalid ZIP Code!");
      } else {
        setSupplier((prev) => ({
          ...prev,
          address: formatUpper(data.logradouro || "", "address"),
          neighborhood: formatUpper(data.bairro || "", "neighborhood"),
          city: formatUpper(data.localidade || "", "city"),
          state: formatUpper(data.uf || "", "state"),
        }));
      }
    } catch {
      toast.error("Failed to fetch address!");
    }
  };

  const fetchCNPJ = async () => {
    const cleanDoc = supplier.document.replace(/\D/g, "");
    if (cleanDoc.length !== 14) return;
    try {
      const { data } = await axios.get(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanDoc}`,
      );
      setSupplier((prev) => ({
        ...prev,
        name: formatUpper(data.razao_social || "", "name"),
        fantasy_name: formatUpper(data.nome_fantasia || "", "fantasy_name"),
        address: formatUpper(data.logradouro || "", "address"),
        neighborhood: formatUpper(data.bairro || "", "neighborhood"),
        city: formatUpper(data.municipio || "", "city"),
        state: formatUpper(data.uf || "", "state"),
        zip_code: data.cep?.replace(/\D/g, "") || "",
        number: data.numero || "",
        complement: data.complemento || "",
        phone: data.telefone || "",
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

  const formatPhone = (value: string) => {
    const phone = value.replace(/\D/g, "").slice(0, 11);
    return phone.length > 10
      ? phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      : phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  const handleSubmit = async () => {
    if (!supplier.name || !supplier.document || !companyId) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const cleanedDocument = supplier.document.replace(/\D/g, "");
    const documentType = getDocumentType(supplier.document);

    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("document", cleanedDocument)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existing) {
      toast.error("Supplier already exists.");
      return;
    }

    const { error } = await supabase.from("suppliers").insert([
      {
        ...supplier,
        document: cleanedDocument, // <--- DOCUMENTO LIMPO
        company_id: companyId,
        type: documentType,
      },
    ]);

    if (error) {
      toast.error("Error creating supplier: " + error.message);
    } else {
      toast.success("Supplier successfully created!");
      router.push("/dashboard/suppliers");
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
      <div className="flex gap-2 items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Adicionar Fornecedor</h1>
      </div>

      {/* 🔹 Campos do formulário */}
      {Object.keys(placeholders).map((field, index) => {
        if (
          supplier.type === "CPF" &&
          ["fantasy_name", "state_registration"].includes(field)
        )
          return null;
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

      <Button className="mt-4 w-full" onClick={handleSubmit}>
        Salvar
      </Button>
    </div>
  );
}
