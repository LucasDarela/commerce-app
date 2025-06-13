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
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Cliente = {
  id?: string;
  created_at?: string;
  price_table_id?: string;
  type: string;
  document: string;
  name: string;
  fantasy_name?: string;
  zip_code: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  phone: string;
  email: string;
  state_registration?: string;
  emit_nf?: boolean;
};

export default function EditClient() {
  const router = useRouter();
  const { id } = useParams();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([]);
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
    emit_nf: false,
  });

  const placeholdersMap: Record<string, string> = {
    document: "CPF/CNPJ",
    name: "Nome Completo / Razão Social",
    fantasy_name: "Nome Fantasia",
    zip_code: "CEP (Obrigatório caso gere NFe)",
    address: "Endereço",
    neighborhood: "Bairro",
    city: "Cidade",
    state: "Estado",
    number: "Número",
    complement: "Complemento",
    phone: "Telefone",
    email: "Email (Obrigatório caso gere boleto)",
    state_registration: "Inscrição Estadual",
  };

  const formatarMaiusculo = (valor: string, campo: string) => {
    return campo === "email" ? valor : valor.toUpperCase();
  };

  useEffect(() => {
    const fetchCliente = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Erro ao carregar cliente");
        console.error("❌ Erro ao buscar cliente:", error?.message);
      } else {
        setCliente({
          ...data,
          name: formatarMaiusculo(data.name || "", "name"),
          fantasy_name: formatarMaiusculo(
            data.fantasy_name || "",
            "fantasy_name",
          ),
          address: formatarMaiusculo(data.address || "", "address"),
          neighborhood: formatarMaiusculo(
            data.neighborhood || "",
            "neighborhood",
          ),
          city: formatarMaiusculo(data.city || "", "city"),
          state: formatarMaiusculo(data.state || "", "state"),
          state_registration: formatarMaiusculo(
            data.state_registration || "",
            "state_registration",
          ),
          price_table_id: data.price_table_id || "",
          emit_nf: data.emit_nf ?? false,
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
        .select("id, name");

      if (error) {
        toast.error("Erro ao buscar catálogos");
      } else {
        setCatalogs(data || []);
      }
    };

    fetchCatalogs();
  }, []);

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

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
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
      const { data } = await axios.get(
        `https://viacep.com.br/ws/${cliente.zip_code}/json/`,
      );
      if (data.erro) {
        toast.error("CEP inválido!");
        setCliente((prev) => ({
          ...prev,
          address: "",
          neighborhood: "",
          city: "",
          state: "",
        }));
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
    const clienteToUpdate = { ...cliente };
    delete clienteToUpdate.id;
    delete clienteToUpdate.created_at;

    clienteToUpdate.phone = cliente.phone.replace(/\D/g, "");

    const { error } = await supabase
      .from("customers")
      .update(clienteToUpdate)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar cliente: " + error.message);
    } else {
      toast.success("Cliente atualizado com sucesso!");
      router.push("/dashboard/customers");
    }
  };

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, "").slice(0, 13);

    if (numeros.length >= 12) {
      return numeros.replace(
        /^(\d{2})(\d{2})(\d{5})(\d{4})$/,
        "+$1 ($2) $3-$4",
      );
    }

    if (numeros.length >= 11) {
      return numeros.replace(
        /^(\d{2})(\d{2})(\d{4,5})(\d{0,4})$/,
        "+$1 ($2) $3-$4",
      );
    }

    return "+" + numeros;
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
      <div className="flex gap-2 items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Edit Customer</h1>
      </div>

      <div className="flex gap-2 mb-6 items-center justify-center">
        <Button
          variant={cliente.type === "CPF" ? "default" : "outline"}
          disabled
        >
          Pessoa Física
        </Button>
        <Button
          variant={cliente.type === "CNPJ" ? "default" : "outline"}
          disabled
        >
          Pessoa Jurídica
        </Button>
      </div>

      {Object.keys(placeholdersMap).map((campo, index) => {
        if (
          cliente.type === "CPF" &&
          ["fantasy_name", "state_registration"].includes(campo)
        )
          return null;
        return (
          <Input
            key={campo}
            type={campo === "email" ? "email" : "text"}
            name={campo}
            placeholder={placeholdersMap[campo]}
            value={
              typeof cliente[campo as keyof typeof cliente] === "boolean"
                ? cliente[campo as keyof typeof cliente]
                  ? "Sim"
                  : "Não"
                : ((cliente[campo as keyof typeof cliente] as
                    | string
                    | number
                    | undefined) ?? "")
            }
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
      <div className="flex items-center space-x-2 mt-4">
        <Checkbox
          id="emit_nf"
          checked={cliente.emit_nf ?? false}
          onCheckedChange={(checked) =>
            setCliente((prev) => ({ ...prev, emit_nf: checked === true }))
          }
        />
        <label htmlFor="emit_nf" className="text-sm font-medium leading-none">
          Emitir Nota Fiscal
        </label>
      </div>

      <Button className="mt-4 w-full" onClick={handleUpdate}>
        Atualizar
      </Button>
    </div>
  );
}
