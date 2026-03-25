"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

export default function EditSupplier() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? "");
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supplier, setSupplier] = useState({
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

  const placeholdersMap: Record<string, string> = {
    document: "CPF/CNPJ",
    name: "Business Name",
    fantasy_name: "Trade Name",
    zip_code: "ZIP Code",
    address: "Address",
    neighborhood: "Neighborhood",
    city: "City",
    state: "State",
    number: "Number",
    complement: "Complement",
    phone: "Phone",
    email: "Email (Optional)",
    state_registration: "State Registration",
  };

  const sanitizeDigits = (value: string) => value.replace(/\D/g, "");

  const formatUppercase = (value: string, field: string) => {
    return field === "email" ? value : value.toUpperCase();
  };

  const formatPhone = (value: string) => {
    const phone = value.replace(/\D/g, "").slice(0, 11);
    return phone.length > 10
      ? phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      : phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) {
        toast.error("Fornecedor inválido.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("suppliers")
        .select(
          `
          document,
          name,
          fantasy_name,
          zip_code,
          address,
          neighborhood,
          city,
          state,
          number,
          complement,
          phone,
          email,
          state_registration
        `,
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Error loading supplier");
        console.error("Supplier fetch error:", error?.message);
        setLoading(false);
        return;
      }

      setSupplier({
        document: data.document ?? "",
        name: formatUppercase(data.name || "", "name"),
        fantasy_name: formatUppercase(
          data.fantasy_name || "",
          "fantasy_name",
        ),
        zip_code: sanitizeDigits(data.zip_code || ""),
        address: formatUppercase(data.address || "", "address"),
        neighborhood: formatUppercase(
          data.neighborhood || "",
          "neighborhood",
        ),
        city: formatUppercase(data.city || "", "city"),
        state: formatUppercase(data.state || "", "state"),
        number: data.number ? String(data.number) : "",
        complement: data.complement || "",
        phone: data.phone ? formatPhone(data.phone) : "",
        email: data.email || "",
        state_registration: formatUppercase(
          data.state_registration || "",
          "state_registration",
        ),
      });

      setLoading(false);
    };

    fetchSupplier();
  }, [id, supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;

    let formattedValue = rawValue;

    if (name === "phone") {
      formattedValue = formatPhone(rawValue);
    } else if (name === "email") {
      formattedValue = rawValue.trim().toLowerCase();
    } else if (name === "zip_code") {
      formattedValue = sanitizeDigits(rawValue).slice(0, 8);
    } else {
      formattedValue = formatUppercase(rawValue, name);
    }

    setSupplier((prevSupplier) => ({
      ...prevSupplier,
      [name]: formattedValue,
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      nextInput?.focus();
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
        setSupplier((prev) => ({
          ...prev,
          address: "",
          neighborhood: "",
          city: "",
          state: "",
        }));
        return;
      }

      setSupplier((prev) => ({
        ...prev,
        zip_code: cleanZip,
        address: formatUppercase(data.logradouro || "", "address"),
        neighborhood: formatUppercase(data.bairro || "", "neighborhood"),
        city: formatUppercase(data.localidade || "", "city"),
        state: formatUppercase(data.uf || "", "state"),
      }));
    } catch (error) {
      console.error("fetchAddress", error);
      toast.error("Error fetching address!");
    }
  };

  const handleUpdate = async () => {
    if (!id) {
      toast.error("Fornecedor inválido.");
      return;
    }

    if (!supplier.name.trim()) {
      toast.error("Nome do fornecedor é obrigatório.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: supplier.name.trim().toUpperCase(),
        fantasy_name: supplier.fantasy_name.trim().toUpperCase() || null,
        zip_code: sanitizeDigits(supplier.zip_code) || null,
        address: supplier.address.trim().toUpperCase() || null,
        neighborhood: supplier.neighborhood.trim().toUpperCase() || null,
        city: supplier.city.trim().toUpperCase() || null,
        state: supplier.state.trim().toUpperCase() || null,
        number: supplier.number.trim() || null,
        complement: supplier.complement.trim() || null,
        phone: sanitizeDigits(supplier.phone) || null,
        email: supplier.email.trim().toLowerCase() || null,
        state_registration:
          supplier.state_registration.trim().toUpperCase() || null,
      };

      const { error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", id);

      if (error) {
        toast.error("Error updating supplier: " + error.message);
        return;
      }

      toast.success("Supplier updated successfully!");
      router.push("/dashboard/suppliers");
    } catch (error) {
      console.error("handleUpdate", error);
      toast.error("Erro inesperado ao atualizar fornecedor.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading supplier...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
      <div className="flex gap-2 items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Edit Supplier</h1>
      </div>

      {Object.keys(placeholdersMap).map((field, index) => (
        <Input
          key={field}
          type={field === "email" ? "email" : "text"}
          name={field}
          placeholder={placeholdersMap[field]}
          value={supplier[field as keyof typeof supplier]}
          onChange={handleChange}
          onBlur={field === "zip_code" ? fetchAddress : undefined}
          onKeyDown={(e) => handleKeyDown(e, index)}
          ref={(el) => {
            if (el) inputRefs.current[index] = el;
          }}
          className="mt-2"
          disabled={field === "document"}
        />
      ))}

      <Button className="mt-4 w-full" onClick={handleUpdate} disabled={saving}>
        {saving ? "Updating..." : "Update"}
      </Button>
    </div>
  );
}