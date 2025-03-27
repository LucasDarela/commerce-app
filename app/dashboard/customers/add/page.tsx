"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function CreateClient() {
  const router = useRouter();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
  
        if (error || !data.user) {
          console.error("Erro ao buscar usuário logado:", error);
          toast.error("Erro ao carregar informações do usuário.");
          return;
        }
  
        console.log("🔹 Usuário autenticado:", data.user);
  
        // 🔹 Buscar informações do usuário no banco pelo e-mail
        const { data: userData, error: userError } = await supabase
          .from("user") // ✅ Verifique se a tabela correta é "user" ou "users"
          .select("id, email, empresa_id") // ✅ Buscar também o `empresa_id`
          .eq("email", data.user.email)
          .maybeSingle();
  
        if (userError || !userData) {
          console.error("❌ Erro ao buscar empresa do usuário:", userError);
          toast.error("Erro ao carregar dados da empresa.");
          return;
        }
  
        console.log("🔹 Usuário logado encontrado:", userData);
        setUsuarioLogado(userData);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar usuário logado:", error);
        toast.error("Erro inesperado ao carregar dados do usuário.");
      }
    };
  
    fetchUser();
  }, []);

  const [cliente, setCliente] = useState({
    type: "CPF",
    document: "",
    name: "",
    fantasy_name: "",
    cep: "",
    address: "",
    bairro: "",
    city: "",
    state: "",
    numero: "",
    complemento: "",
    phone: "",
    email: "",
    state_registration: "",
  });

  const placeholdersMap: Record<string, string> = {
    document: "CPF/CNPJ",
    name: "Nome Completo / Razão Social",
    fantasy_name: "Nome Fantasia",
    cep: "CEP",
    address: "Endereço",
    bairro: "Bairro",
    city: "Cidade",
    state: "Estado",
    numero: "Número",
    complemento: "Complemento",
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
      cep: "",
      address: "",
      bairro: "",
      city: "",
      state: "",
      numero: "",
      complemento: "",
      phone: "",
      email: "",
      state_registration: "",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      let nextIndex = index + 1;

      if (cliente.type === "CPF" && index === 1) {
        nextIndex = 3;
      } else if (cliente.type === "CNPJ" && index === 1) {
        nextIndex = 2;
      }

      const nextInput = inputRefs.current[nextIndex];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const buscarEndereco = async () => {
    if (!cliente.cep || cliente.cep.length !== 8) return;

    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cliente.cep}/json/`);
      if (data.erro) {
        toast.error("CEP inválido!");
      } else {
        setCliente((prev) => ({
          ...prev,
          address: formatarMaiusculo(data.logradouro || "", "address"),
          bairro: formatarMaiusculo(data.bairro || "", "bairro"),
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
      const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);

      if (data) {
        setCliente((prev) => ({
          ...prev,
          name: formatarMaiusculo(data.razao_social || "", "name"),
          fantasy_name: formatarMaiusculo(data.nome_fantasia || "", "fantasy_name"),
          address: formatarMaiusculo(data.logradouro || "", "address"),
          bairro: formatarMaiusculo(data.bairro || "", "bairro"),
          city: formatarMaiusculo(data.municipio || "", "city"),
          state: formatarMaiusculo(data.uf || "", "state"),
          cep: data.cep || "",
          numero: data.numero || "",
          complemento: data.complemento || "",
          phone: data.telefone || "",
          email: data.email || "",
          state_registration: formatarMaiusculo(data.inscricao_estadual || "", "state_registration"),
        }));
      }
    } catch {
      toast.error("Erro ao buscar CNPJ!");
    }
  };

  const validarCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/\D/g, ""); // 🔹 Remove tudo que não for número
    
    if (cpf.length !== 11) return false;
  
    // 🔹 Verifica se todos os dígitos são iguais (ex: 111.111.111-11), pois isso é inválido
    if (/^(\d)\1+$/.test(cpf)) return false;
  
    let sum = 0;
    let remainder;
  
    // 🔹 Calcula o primeiro dígito verificador
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
  
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf[9])) return false;
  
    sum = 0;
  
    // 🔹 Calcula o segundo dígito verificador
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
  
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf[10]);
  };

  const handleSubmit = async () => {
    if (!cliente.name || !cliente.document) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

      // 🔹 Validação de CPF
  if (cliente.type === "CPF" && !validarCPF(cliente.document)) {
    toast.error("CPF inválido!");
    return;
  }
  
    if (!usuarioLogado || !usuarioLogado.empresa_id) {
      toast.error("Erro ao identificar a empresa do usuário!");
      return;
    }
  
    // 🔹 Verificar se já existe um cliente com esse CPF/CNPJ vinculado à empresa
    const { data: clienteExistente, error: consultaError } = await supabase
      .from("clients")
      .select("id")
      .eq("document", cliente.document)
      .eq("empresa_id", usuarioLogado.empresa_id) // ✅ Busca clientes apenas da empresa do usuário
      .maybeSingle();
  
    if (consultaError && consultaError.code !== "PGRST116") {
      toast.error("Erro ao verificar CPF/CNPJ!");
      return;
    }
  
    if (clienteExistente) {
      toast.error("Já existe um cliente com esse CPF/CNPJ nesta empresa!");
      return;
    }
  
    // 🔹 Criar novo cliente associado à empresa do usuário
    const { error } = await supabase.from("clients").insert([
      {
        ...cliente,
        empresa_id: usuarioLogado.empresa_id, // ✅ Garante que o cliente está associado à empresa correta
      }
    ]);
  
    if (error) {
      toast.error("Erro ao cadastrar cliente: " + error.message);
    } else {
      toast.success("Cliente cadastrado com sucesso!");
      router.push("/dashboard/clientes");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Cadastrar Cliente</h1>

      {/* 🔹 Botões para selecionar CPF ou CNPJ */}
      <div className="flex gap-2 mb-4">
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
            onBlur={campo === "cep" ? buscarEndereco : campo === "document" && cliente.type === "CNPJ" ? buscarCNPJ : undefined}
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
