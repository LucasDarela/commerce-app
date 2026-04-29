"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
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
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

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
  number: string | null;
  complement: string;
  phone: string | null;
  email: string | null;
  state_registration?: string;
  emit_nf?: boolean;
};

function limparNumero(valor: string | number | null | undefined) {
  if (typeof valor !== "string") return "";
  return valor.replace(/\D/g, "");
}

function formatarTelefone(valor: string, isInternational: boolean = false) {
  if (!valor) return "";

  if (isInternational) {
    let texto = valor.replace(/[a-zA-Z]/g, "");
    if (texto && !texto.startsWith("+")) {
      texto = "+" + texto.replace(/\+/g, "");
    }
    return texto;
  }

  let numeros = valor.replace(/\D/g, "");
  if (!numeros) return "";

  if (numeros.startsWith("550")) {
    numeros = "55" + numeros.substring(3);
  } else if (numeros.startsWith("0")) {
    numeros = numeros.substring(1);
  }

  if ((numeros.length === 10 || numeros.length === 11) && !numeros.startsWith("55")) {
    numeros = "55" + numeros;
  }

  numeros = numeros.slice(0, 13);

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
}

export default function EditClient() {
  const supabase = createBrowserSupabaseClient();     
  const router = useRouter();
  const { id } = useParams();
  const { companyId, loading: authLoading } = useAuthenticatedCompany();

  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([]);
  const [isInternationalPhone, setIsInternationalPhone] = useState(false);
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
      if (!id || !companyId || authLoading) return;

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (error || !data) {
        toast.error("Erro ao carregar cliente");
        console.error("❌ Erro ao buscar cliente:", error?.message);
        setLoading(false);
        return;
      }

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
        phone: formatarTelefone(String(data.phone || "")),
      });

      setLoading(false);
    };

    fetchCliente();
  }, [id, companyId, authLoading]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!companyId || authLoading) return;

      const { data, error } = await supabase
        .from("price_tables")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) {
        toast.error("Erro ao buscar catálogos");
      } else {
        setCatalogs(data || []);
      }
    };

    fetchCatalogs();
  }, [companyId, authLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;

    const formattedValue =
      name === "phone"
        ? formatarTelefone(rawValue, isInternationalPhone)
        : name === "email"
          ? rawValue.trim()
          : formatarMaiusculo(rawValue, name);

    setCliente((prevCliente) => ({
      ...prevCliente,
      [name]: formattedValue,
    }));
  };

  const handleInternationalPhoneChange = (checked: boolean) => {
    setIsInternationalPhone(checked);
    setCliente((prev) => ({
      ...prev,
      phone: formatarTelefone(prev.phone || "", checked),
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
    } catch {
      toast.error("Erro ao buscar endereço!");
    }
  };

  const handleUpdate = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    const clienteToUpdate = { ...cliente };
    delete clienteToUpdate.id;
    delete clienteToUpdate.created_at;

    if (!clienteToUpdate.email) {
      clienteToUpdate.email = null;
    }

    const telefoneNumericoText = String(cliente.phone ?? "").replace(/\D/g, "");
    if (!isInternationalPhone && telefoneNumericoText.length > 0 && telefoneNumericoText.length < 12) {
      toast.error("Telefone inválido: o DDD e o número devem estar completos.");
      return;
    }

    const phoneCleaned = limparNumero(cliente.phone);
    clienteToUpdate.phone = phoneCleaned ? String(Number(phoneCleaned)) : null;

    const numberCleaned = limparNumero(cliente.number);
    clienteToUpdate.number = numberCleaned
      ? String(Number(numberCleaned))
      : null;

    clienteToUpdate.type = cliente.type === "CNPJ" ? "CNPJ" : "CPF";

    const { error } = await supabase
      .from("customers")
      .update(clienteToUpdate)
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      toast.error("Erro ao atualizar cliente: " + error.message);
    } else {
      toast.success("Cliente atualizado com sucesso!");
      router.push("/dashboard/customers");
    }
  };

  if (authLoading || loading) {
    return <TableSkeleton />;
  }

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
        ) {
          return null;
        }

        return (
          <div key={campo} className="mt-2">
            <Input
              ref={(el) => {
                if (el) inputRefs.current[index] = el;
              }}
              type={campo === "email" ? "email" : "text"}
              name={campo}
              placeholder={placeholdersMap[campo]}
              value={String(cliente[campo as keyof typeof cliente] ?? "")}
              onChange={handleChange}
              onBlur={campo === "zip_code" ? buscarEndereco : undefined}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
            {campo === "phone" && (
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="international_phone"
                  checked={isInternationalPhone}
                  onCheckedChange={handleInternationalPhoneChange}
                />
                <label
                  htmlFor="international_phone"
                  className="text-sm font-medium leading-none"
                >
                  Número Internacional
                </label>
              </div>
            )}
          </div>
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