"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

type Cliente = {
  id?: string
  created_at?: string
  price_table_id?: string
  type: string
  document: string
  name: string
  fantasy_name?: string
  zip_code: string
  address: string
  neighborhood: string
  city: string
  state: string
  number: string
  complement: string
  phone: string
  email: string
  state_registration?: string
}

export default function EditClient() {
  const router = useRouter();
  const { id } = useParams();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([])
  const [cliente, setCliente] = useState<Cliente>({
    type: "CPF",
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
    name: "Nome Completo / Razão Social",
    fantasy_name: "Nome Fantasia",
    zip_code: "CEP",
    address: "Endereço",
    neighborhood: "Bairro",
    city: "Cidade",
    state: "Estado",
    number: "Número",
    complement: "Complemento",
    phone: "Telefone",
    email: "Email (Opcional)",
    state_registration: "Inscrição Estadual",
  };

  const formatarMaiusculo = (valor: string, campo: string) => {
    return campo === "email" ? valor : valor.toUpperCase();
  };

  useEffect(() => {
    const fetchCliente = async () => {
      if (!id) return;

      const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();

      if (error || !data) {
        toast.error("Erro ao carregar cliente");
        console.error("❌ Erro ao buscar cliente:", error?.message);
      } else {
        setCliente({
          ...data,
          name: formatarMaiusculo(data.name || "", "name"),
          fantasy_name: formatarMaiusculo(data.fantasy_name || "", "fantasy_name"),
          address: formatarMaiusculo(data.address || "", "address"),
          neighborhood: formatarMaiusculo(data.neighborhood || "", "neighborhood"),
          city: formatarMaiusculo(data.city || "", "city"),
          state: formatarMaiusculo(data.state || "", "state"),
          state_registration: formatarMaiusculo(data.state_registration || "", "state_registration"),
          price_table_id: data.price_table_id || "",
        });
      }
      setLoading(false);
    };

    fetchCliente();
  }, [id]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      const { data, error } = await supabase
        .from("price_tables")
        .select("id, name")
  
      if (error) {
        toast.error("Erro ao buscar catálogos")
      } else {
        setCatalogs(data || [])
      }
    }
  
    fetchCatalogs()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;
    const formattedValue =
      name === "phone"
        ? formatarTelefone(rawValue)
        : name === "email"
        ? rawValue.trim()
        : formatarMaiusculo(rawValue, name);

    setCliente((prevCliente) => ({
      ...prevCliente,
      [name]: formattedValue,
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const buscarEndereco = async () => {
    if (!cliente.zip_code || cliente.zip_code.length !== 8) return;

    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cliente.zip_code}/json/`);
      if (data.erro) {
        toast.error("CEP inválido!");
        setCliente((prev) => ({ ...prev, address: "", neighborhood: "", city: "", state: "" }));
      } else {
        setCliente((prev) => ({
          ...prev,
          address: formatarMaiusculo(data.logradouro || "", "address"),
          neighborhood: formatarMaiusculo(data.bairro || "", "neighborhood"),
          city: formatarMaiusculo(data.localidade || "", "city"),
          state: formatarMaiusculo(data.uf || "", "state"),
        }));
      }
    } catch (error) {
      toast.error("Erro ao buscar endereço!");
    }
  };

  const handleUpdate = async () => {
    const clienteToUpdate = { ...cliente }
    delete clienteToUpdate.id
    delete clienteToUpdate.created_at // também pode dar conflito

    const { error } = await supabase
      .from("customers")
      .update(clienteToUpdate)
      .eq("id", id)

    if (error) {
      toast.error("Erro ao atualizar cliente: " + error.message);
      console.log("Enviando dados:", cliente)
    } else {
      toast.success("Cliente atualizado com sucesso!");
      router.push("/dashboard/customers");
    }
  };

  const formatarTelefone = (valor: string) => {
    let telefone = valor.replace(/\D/g, "").slice(0, 11);
    if (telefone.length >= 3) {
      telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2)}`;
    }
    return telefone;
  };

  if (loading) {
    return <p className="text-center text-gray-500">Carregando cliente...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
      <div  className="flex gap-2 items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Edit Customer</h1>
      </div>

      <div className="flex gap-2 mb-6 items-center justify-center">
        <Button variant={cliente.type === "CPF" ? "default" : "outline"} disabled>Pessoa Física</Button>
        <Button variant={cliente.type === "CNPJ" ? "default" : "outline"} disabled>Pessoa Jurídica</Button>
      </div>

      {Object.keys(placeholdersMap).map((campo, index) => {
        if (cliente.type === "CPF" && ["fantasy_name", "state_registration"].includes(campo)) return null;
        return (
          <Input
            key={campo}
            type={campo === "email" ? "email" : "text"}
            name={campo}
            placeholder={placeholdersMap[campo]}
            value={cliente[campo as keyof typeof cliente] || ""}
            onChange={handleChange}
            onBlur={campo === "zip_code" ? buscarEndereco : undefined}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="mt-2"
          />
        );
      })}

      <div className="mt-4">
      <Select
        value={cliente.price_table_id || ""}
        onValueChange={(value) =>
          setCliente((prev) => ({ ...prev, price_table_id: value }))
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione um catálogo de produtos" />
        </SelectTrigger>
        <SelectContent>
          {catalogs.map((catalog) => (
            <SelectItem key={catalog.id} value={catalog.id}>
              {catalog.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </div>

      <Button className="mt-4 w-full" onClick={handleUpdate}>Atualizar</Button>
    </div>
  );
}