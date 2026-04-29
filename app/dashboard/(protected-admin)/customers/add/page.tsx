"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Link from "next/link";

const initialCliente = {
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
  emit_nf: "",
};

function limparNumero(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const limpo = valor.replace(/\D/g, "");
  return limpo ? Number(limpo) : null;
}

function formatarTelefone(valor: string, isInternational: boolean = false) {
  if (!valor) return "";

  if (isInternational) {
    // Permite formatação livre (espaços, parênteses, traços), removendo apenas letras
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

  if (
    (numeros.length === 10 || numeros.length === 11) &&
    !numeros.startsWith("55")
  ) {
    numeros = "55" + numeros;
  }

  numeros = numeros.slice(0, 13);

  if (numeros.length >= 12) {
    return numeros.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, "+$1 ($2) $3-$4");
  }

  if (numeros.length >= 11) {
    return numeros.replace(
      /^(\d{2})(\d{2})(\d{4,5})(\d{0,4})$/,
      "+$1 ($2) $3-$4",
    );
  }

  return "+" + numeros;
}

export default function CreateClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const { companyId, loading } = useAuthenticatedCompany();

  const [cliente, setCliente] = useState(initialCliente);
  const [isInternationalPhone, setIsInternationalPhone] = useState(false);
  const [emitNf, setEmitNf] = useState(false);
  const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState("");

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
    return campo === "email" ? valor.trim() : valor.toUpperCase();
  };

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
      phone: formatarTelefone(prev.phone, checked),
    }));
  };

  const setTipoCliente = (tipo: "CPF" | "CNPJ") => {
    setCliente({
      ...initialCliente,
      type: tipo,
    });
    setEmitNf(false);
    setSelectedCatalog("");
  };

  const buscarEndereco = async () => {
    const cep = cliente.zip_code.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

      if (data.erro) {
        toast.error("CEP inválido!");
        return;
      }

      setCliente((prev) => ({
        ...prev,
        address: formatarMaiusculo(data.logradouro || "", "address"),
        neighborhood: formatarMaiusculo(data.bairro || "", "neighborhood"),
        city: formatarMaiusculo(data.localidade || "", "city"),
        state: formatarMaiusculo(data.uf || "", "state"),
      }));
    } catch {
      toast.error("Erro ao buscar endereço!");
    }
  };

  const buscarCNPJ = async () => {
    const cnpjLimpo = cliente.document.replace(/\D/g, "");

    if (cnpjLimpo.length !== 14) {
      toast.error("CNPJ inválido!");
      return;
    }

    try {
      const { data } = await axios.get(`/api/cnpj?cnpj=${cnpjLimpo}`);

      if (data && (data.nome_fantasia || data.razao_social)) {
        setCliente((prev) => ({
          ...prev,
          name: formatarMaiusculo(data.razao_social || "", "name"),
          fantasy_name: formatarMaiusculo(
            data.nome_fantasia || "",
            "fantasy_name",
          ),
          address: formatarMaiusculo(data.logradouro || "", "address"),
          neighborhood: formatarMaiusculo(data.bairro || "", "neighborhood"),
          city: formatarMaiusculo(data.municipio || "", "city"),
          state: formatarMaiusculo(data.uf || "", "state"),
          zip_code: data.cep?.replace(/\D/g, "") || "",
          number: data.numero || "",
          complement: data.complemento || "",
          phone: formatarTelefone(data.telefone || ""),
          email: data.email || "",
          state_registration: "",
        }));
      } else {
        toast.error("Dados não encontrados para esse CNPJ.");
      }
    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error);
      toast.error("Erro ao buscar CNPJ!");
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    }
  };

  const validarCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);

    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;

    return resto === parseInt(cpf[10]);
  };

  const handleSubmit = async () => {
    if (isSubmitting || loading) return;
    setIsSubmitting(true);

    try {
      if (!cliente.name.trim() || !cliente.document.trim()) {
        toast.error("Preencha os campos obrigatórios!");
        return;
      }

      if (!companyId) {
        toast.error("Erro ao identificar a empresa do usuário!");
        return;
      }

      if (cliente.type === "CPF" && !validarCPF(cliente.document)) {
        toast.error("CPF inválido!");
        return;
      }

      const telefoneNumericoText = cliente.phone.replace(/\D/g, "");
      if (
        !isInternationalPhone &&
        telefoneNumericoText.length > 0 &&
        telefoneNumericoText.length < 12
      ) {
        toast.error(
          "Telefone inválido: o DDD e o número devem estar completos.",
        );
        return;
      }

      const documentoLimpo = cliente.document.replace(/\D/g, "");

      const { data: clienteExistente, error: consultaError } = await supabase
        .from("customers")
        .select("id")
        .eq("document", documentoLimpo)
        .eq("company_id", companyId)
        .maybeSingle();

      if (consultaError) {
        console.error("Erro ao verificar cliente existente:", consultaError);
        toast.error("Erro ao verificar CPF/CNPJ!");
        return;
      }

      if (clienteExistente) {
        toast.error("Já existe um cliente com esse CPF/CNPJ nesta empresa!");
        return;
      }

      const telefoneNumerico = limparNumero(cliente.phone);
      const numeroEnderecoNumerico = limparNumero(cliente.number);

      const payload = {
        ...cliente,
        document: documentoLimpo,
        phone: telefoneNumerico,
        number: numeroEnderecoNumerico,
        fantasy_name:
          cliente.type === "CPF" ? null : cliente.fantasy_name.trim() || null,
        state_registration:
          cliente.type === "CPF"
            ? null
            : cliente.state_registration.trim() || null,
        price_table_id: selectedCatalog || null,
        company_id: companyId,
        emit_nf: emitNf,
      };

      const { data: insertedCustomer, error } = await supabase
        .from("customers")
        .insert([payload])
        .select("id")
        .single();

      if (error) {
        console.error("Erro ao cadastrar cliente:", error);
        toast.error(
          <div>
            Erro ao cadastrar cliente: Os campos Cpf/Cnpj, Nome/Razão Social,
            Telefone e Catálogo são obrigatórios.{" "}
            <Link href="/dashboard/help" className="underline font-medium">
              Acesse aqui
            </Link>{" "}
            para obter ajuda.
          </div>,
          { duration: 6000 },
        );
        return;
      }

      const clienteIdRecemCriado = insertedCustomer?.id;

      toast.success("Cliente cadastrado com sucesso!");
      setCliente({
        ...initialCliente,
        type: cliente.type,
      });
      setEmitNf(false);
      setSelectedCatalog("");

      router.refresh();

      if (redirectTo) {
        router.push(`${redirectTo}?newCustomerId=${clienteIdRecemCriado}`);
      } else {
        router.push("/dashboard/customers");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!companyId) return;

      const { data, error } = await supabase
        .from("price_tables")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao buscar catálogos:", error);
        toast.error("Erro ao buscar catálogos de preço");
        return;
      }

      setCatalogs(data || []);
    };

    fetchCatalogs();
  }, [companyId, supabase]);

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
      <div className="flex gap-2 items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Adicionar Cliente</h1>
      </div>

      <div className="flex gap-2 mb-6 items-center justify-center">
        <Button
          variant={cliente.type === "CPF" ? "default" : "outline"}
          onClick={() => setTipoCliente("CPF")}
        >
          Pessoa Física
        </Button>
        <Button
          variant={cliente.type === "CNPJ" ? "default" : "outline"}
          onClick={() => setTipoCliente("CNPJ")}
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
              type={campo === "email" ? "email" : "text"}
              name={campo}
              placeholder={placeholdersMap[campo]}
              value={cliente[campo as keyof typeof cliente]}
              onChange={handleChange}
              onBlur={
                campo === "zip_code"
                  ? buscarEndereco
                  : campo === "document" && cliente.type === "CNPJ"
                    ? buscarCNPJ
                    : undefined
              }
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => {
                if (el) inputRefs.current[index] = el;
              }}
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
        <Select value={selectedCatalog} onValueChange={setSelectedCatalog}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um catálogo de preço" />
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
          checked={emitNf}
          onCheckedChange={(checked) => setEmitNf(!!checked)}
        />
        <label htmlFor="emit_nf" className="text-sm font-medium leading-none">
          Emitir Nota Fiscal
        </label>
      </div>

      <Button
        className="mt-4 w-full"
        onClick={handleSubmit}
        disabled={isSubmitting || loading}
      >
        {isSubmitting ? "Salvando" : "Cadastrar"}
      </Button>
    </div>
  );
}
