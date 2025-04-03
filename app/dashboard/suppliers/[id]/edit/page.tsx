"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

export default function EditSupplier() {
  const router = useRouter();
  const { id } = useParams();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [loading, setLoading] = useState(true);
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

  const formatUppercase = (value: string, field: string) => {
    return field === "email" ? value : value.toUpperCase();
  };

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) return;

      const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();

      if (error || !data) {
        toast.error("Error loading supplier");
        console.error("❌ Supplier fetch error:", error?.message);
      } else {
        setSupplier({
          ...data,
          name: formatUppercase(data.name || "", "name"),
          fantasy_name: formatUppercase(data.fantasy_name || "", "fantasy_name"),
          address: formatUppercase(data.address || "", "address"),
          neighborhood: formatUppercase(data.neighborhood || "", "neighborhood"),
          city: formatUppercase(data.city || "", "city"),
          state: formatUppercase(data.state || "", "state"),
          state_registration: formatUppercase(data.state_registration || "", "state_registration"),
        });
      }
      setLoading(false);
    };

    fetchSupplier();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;
    const formattedValue =
      name === "phone"
        ? formatPhone(rawValue)
        : name === "email"
        ? rawValue.trim()
        : formatUppercase(rawValue, name);

    setSupplier((prevSupplier) => ({
      ...prevSupplier,
      [name]: formattedValue,
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      nextInput?.focus();
    }
  };

  const fetchAddress = async () => {
    if (!supplier.zip_code || supplier.zip_code.length !== 8) return;

    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${supplier.zip_code}/json/`);
      if (data.erro) {
        toast.error("Invalid ZIP Code!");
        setSupplier((prev) => ({ ...prev, address: "", neighborhood: "", city: "", state: "" }));
      } else {
        setSupplier((prev) => ({
          ...prev,
          address: formatUppercase(data.logradouro || "", "address"),
          neighborhood: formatUppercase(data.bairro || "", "neighborhood"),
          city: formatUppercase(data.localidade || "", "city"),
          state: formatUppercase(data.uf || "", "state"),
        }));
      }
    } catch (error) {
      toast.error("Error fetching address!");
    }
  };

  const handleUpdate = async () => {
    const { error } = await supabase.from("suppliers").update(supplier).eq("id", id);

    if (error) {
      toast.error("Error updating supplier: " + error.message);
    } else {
      toast.success("Supplier updated successfully!");
      router.push("/dashboard/suppliers");
    }
  };

  const formatPhone = (value: string) => {
    const phone = value.replace(/\D/g, "").slice(0, 11);
    return phone.length > 10
      ? phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      : phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading supplier...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
      <div  className="flex gap-2 items-center justify-center">
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

      <Button className="mt-4 w-full" onClick={handleUpdate}>Update</Button>
    </div>
  );
}