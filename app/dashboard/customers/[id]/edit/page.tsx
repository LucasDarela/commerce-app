"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

export default function EditClient() {
  const router = useRouter();
  const { id } = useParams();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState({
    tipe: "CPF",
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

  // 🔹 Mapeamento dos placeholders personalizados
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

  // 🔹 Converter para Maiúsculas (exceto email)
  const formatarMaiusculo = (valor: string, campo: string) => {
    return campo === "email" ? valor : valor.toUpperCase();
  };

  // 🔹 Buscar Cliente no Supabase
  useEffect(() => {
    const fetchCliente = async () => {
      if (!id) return;

      console.log("🔍 Buscando cliente ID:", id);

      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();

      if (error || !data) {
        toast.error("Erro ao carregar cliente");
        console.error("❌ Erro ao buscar cliente:", error?.message);
      } else {
        console.log("✅ Cliente encontrado:", data);

        setCliente({
          ...data,
          name: formatarMaiusculo(data.name || "", "name"),
          fantasy_name: formatarMaiusculo(data.fantasy_name || "", "fantasy_name"),
          address: formatarMaiusculo(data.address || "", "address"),
          bairro: formatarMaiusculo(data.bairro || "", "bairro"),
          city: formatarMaiusculo(data.city || "", "city"),
          state: formatarMaiusculo(data.state || "", "state"),
          state_registration: formatarMaiusculo(data.state_registration || "", "state_registration"),
        });
      }
      setLoading(false);
    };

    fetchCliente();
  }, [id]);

  // 🔹 Atualiza os dados ao digitar
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;
    const formattedValue =
      name === "phone"
        ? formatarTelefone(rawValue) // 📌 Formata telefone se for o campo "phone"
        : name === "email"
        ? rawValue.trim() // 📌 Mantém email inalterado
        : formatarMaiusculo(rawValue, name); // 📌 Converte para maiúsculo os outros campos
  
    setCliente((prevCliente) => ({
      ...prevCliente,
      [name]: formattedValue,
    }));
  };

  // 🔹 Pula para o próximo campo ao pressionar Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  // 🔹 Buscar Endereço pelo CEP ao sair do campo
  const buscarEndereco = async () => {
    if (!cliente.cep || cliente.cep.length !== 8) return;

    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cliente.cep}/json/`);
      if (data.erro) {
        toast.error("CEP inválido!");
        setCliente((prev) => ({ ...prev, address: "", bairro: "", city: "", state: "" }));
      } else {
        setCliente((prev) => ({
          ...prev,
          address: formatarMaiusculo(data.logradouro || "", "address"),
          bairro: formatarMaiusculo(data.bairro || "", "bairro"),
          city: formatarMaiusculo(data.localidade || "", "city"),
          state: formatarMaiusculo(data.uf || "", "state"),
        }));
      }
    } catch (error) {
      toast.error("Erro ao buscar endereço!");
    }
  };

  // 🔹 Atualizar Cliente no Supabase
  const handleUpdate = async () => {
    const { error } = await supabase.from("clients").update(cliente).eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar cliente: " + error.message);
    } else {
      toast.success("Cliente atualizado com sucesso!");
      router.push("/dashboard/clientes");
    }
  };

  // 🔹 Formatar telefone corretamente
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Cliente</h1>

      {/* 🔹 Botões para CPF e CNPJ (desativados) */}
      <div className="flex gap-2 mb-4">
        <Button variant={cliente.tipe === "CPF" ? "default" : "outline"} disabled>Pessoa Física</Button>
        <Button variant={cliente.tipe === "CNPJ" ? "default" : "outline"} disabled>Pessoa Jurídica</Button>
      </div>

      {/* 🔹 Campos do formulário */}
      {Object.keys(placeholdersMap).map((campo, index) => {
        if (cliente.tipe === "CPF" && ["fantasy_name", "state_registration"].includes(campo)) return null;
        return (
          <Input
            key={campo}
            type={campo === "email" ? "email" : "text"}
            name={campo}
            placeholder={placeholdersMap[campo]}
            value={cliente[campo as keyof typeof cliente]}
            onChange={handleChange}
            onBlur={campo === "cep" ? buscarEndereco : undefined}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="mt-2"
          />
        );
      })}

      <Button className="mt-4 w-full" onClick={handleUpdate}>Atualizar</Button>
    </div>
  );
}