"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

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
};

export default function CreateClient() {
  const router = useRouter();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const { user, companyId, loading } = useAuthenticatedCompany();

  const [cliente, setCliente] = useState(initialCliente);

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

  const setTipoCliente = (tipo: "CPF" | "CNPJ") => {
    setCliente({
      type: tipo,
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
  };

  const buscarEndereco = async () => {
    if (!cliente.zip_code || cliente.zip_code.length !== 8) return;
  
    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cliente.zip_code}/json/`);
  
      if (data.erro) {
        toast.error("CEP inválido!");
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

  const buscarCNPJ = async () => {
    const cnpjLimpo = cliente.document.replace(/\D/g, "");
  
    if (cnpjLimpo.length !== 14) {
      toast.error("CNPJ inválido!");
      return;
    }
  
    try {
      const { data } = await axios.get(`/api/cnpj?cnpj=${cnpjLimpo}`);
  
      if (data) {
        setCliente((prev) => ({
          ...prev,
          name: formatarMaiusculo(data.nome || "", "name"),
          fantasy_name: formatarMaiusculo(data.fantasia || "", "fantasy_name"),
          address: formatarMaiusculo(data.logradouro || "", "address"),
          neighborhood: formatarMaiusculo(data.bairro || "", "neighborhood"),
          city: formatarMaiusculo(data.municipio || "", "city"),
          state: formatarMaiusculo(data.uf || "", "state"),
          zip_code: data.cep?.replace(/\D/g, "") || "",
          number: data.numero || "",
          complement: data.complemento || "",
          phone: formatarTelefone(data.telefone || ""),
          email: data.email || "",
          state_registration: "", // a API usada não retorna isso diretamente
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error);
      toast.error("Erro ao buscar CNPJ!");
    }
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
    if (!cliente.name || !cliente.document) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }
  
    if (cliente.type === "CPF" && !validarCPF(cliente.document)) {
      toast.error("CPF inválido!");
      return;
    }
  
    if (!companyId) {
      toast.error("Erro ao identificar a empresa do usuário!");
      return;
    }
  
    // 🔹 Verificar duplicidade correta (ajustado para usar company_id)
    const { data: clienteExistente, error: consultaError } = await supabase
      .from("customers")
      .select("id")
      .eq("document", cliente.document)
      .eq("company_id", companyId)
      .maybeSingle();
  
    if (consultaError && consultaError.code !== "PGRST116") {
      toast.error("Erro ao verificar CPF/CNPJ!");
      return;
    }
  
    if (clienteExistente) {
      toast.error("Já existe um cliente com esse CPF/CNPJ nesta empresa!");
      return;
    }
  
    const { error } = await supabase.from("customers").insert([
      {
        ...cliente,
        company_id: companyId, 
      },
    ]);
  
    if (error) {
      toast.error("Erro ao cadastrar cliente: " + error.message);
    } else {
      toast.success("Cliente cadastrado com sucesso!");
      setCliente({
        ...initialCliente,
        type: cliente.type,
      });
      router.refresh();
    }
  };

  return (
<div className="max-w-3xl mx-auto w-full px-4 py-6 rounded-lg shadow-md">
  <div  className="flex gap-2 items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Create Customer</h1>
  </div>
      {/* 🔹 Botões para selecionar CPF ou CNPJ */}
      <div className="flex gap-2 mb-6 items-center justify-center">
        <Button variant={cliente.type === "CPF" ? "default" : "outline"} onClick={() => setTipoCliente("CPF")}>
          Pessoa Física
        </Button>
        <Button variant={cliente.type === "CNPJ" ? "default" : "outline"} onClick={() => setTipoCliente("CNPJ")}>
          Pessoa Jurídica
        </Button>
      </div>

      {/* 🔹 Campos do formulário */}
      {Object.keys(placeholdersMap).map((campo, index) => {
        if (cliente.type === "CPF" && ["fantasy_name", "state_registration"].includes(campo)) return null;
        return (
          <Input
            key={campo}
            type={campo === "email" ? "email" : "text"}
            name={campo}
            placeholder={placeholdersMap[campo]}
            value={cliente[campo as keyof typeof cliente]}
            onChange={handleChange}
            onBlur={campo === "zip_code" ? buscarEndereco : campo === "document" && cliente.type === "CNPJ" ? buscarCNPJ : undefined}
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            className="mt-2"
          />
        );
      })}

      <Button className="mt-4 w-full" onClick={handleSubmit}>Cadastrar</Button>
    </div>
  );
}

function formatarTelefone(valor: string) {
  const telefone = valor.replace(/\D/g, "").slice(0, 11); // Remove tudo que não for número e limita a 11 caracteres

  if (telefone.length <= 10) {
    return telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3"); // Formato (XX) XXXX-XXXX
  } else {
    return telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3"); // Formato (XX) XXXXX-XXXX
  }
}
