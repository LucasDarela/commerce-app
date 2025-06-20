"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { PasswordInput } from "./ui/password-input";
import { TableSkeleton } from "./ui/TableSkeleton";

type TeamMember = {
  id: string;
  email: string;
  role: string;
  isBlocked: boolean;
};

export default function TeamManagementPage() {
  const { user, companyId, loading } = useAuthenticatedCompany();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({
    email: "",
    password: "",
    role: "normal",
  });

  const fetchTeam = async () => {
    if (!companyId) return;

    // 1️⃣ Buscar todos os usuários da empresa
    const { data: usersData, error: usersError } = await supabase
      .from("company_users")
      .select("user_id, role")
      .eq("company_id", companyId);

    if (usersError) {
      console.error("Erro ao buscar company_users:", usersError.message);
      return;
    }

    const userIds = usersData.map((user) => user.user_id);

    // 2️⃣ Buscar os perfis correspondentes
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profilesError) {
      console.error("Erro ao buscar profiles:", profilesError.message);
      return;
    }

    // 3️⃣ Unir os dados manualmente
    const members: TeamMember[] = usersData.map((user) => {
      const profile = profilesData.find((p) => p.id === user.user_id);
      return {
        id: user.user_id,
        email: profile?.email || "Desconhecido",
        role: user.role,
        isBlocked: false,
      };
    });

    setTeamMembers(members);
  };

  useEffect(() => {
    if (!user?.id || !companyId) return;

    const fetchCompany = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      if (!error && data) setCompanyName(data.name);
    };

    fetchCompany();
    fetchTeam();
  }, [user?.id, companyId]);

  const handleAddMember = async () => {
    if (!newMember.email || !newMember.password) {
      return toast.error("Preencha o e-mail e a senha.");
    }

    setIsAdding(true);

    try {
      // 1️⃣ Verifica se o e-mail já está em uso
      const { data: emailExistsRaw, error: emailCheckError } =
        await supabase.rpc("check_user_exists", {
          email_input: newMember.email,
        });

      if (emailCheckError) {
        throw new Error("Erro ao verificar e-mail.");
      }

      if (emailExistsRaw) {
        toast.error("Este e-mail já está em uso.");
        return;
      }

      // 2️⃣ Chama a rota backend para criar usuário
      const res = await fetch("/api/users/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newMember.email,
          password: newMember.password,
          company_id: companyId,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Erro ao fazer parse do JSON:", jsonErr);
        throw new Error("Erro interno ao processar resposta.");
      }

      if (!res.ok) {
        console.error("❌ Backend:", data);
        throw new Error(data.error || "Erro ao adicionar membro.");
      }

      // ✅ Sucesso
      toast.success("Membro adicionado com sucesso!");
      await fetchTeam();
      setNewMember({ email: "", password: "", role: "normal" });
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleBlock = (id: string, blocked: boolean) => {
    setTeamMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, isBlocked: blocked } : member,
      ),
    );
  };

  const handleResetPassword = (email: string) => {
    toast("Password reset link sent to " + email);
  };

  const handleRemoveUser = async (id: string) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== id));
    toast("Usuário Removido");
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6 p-8">
      <h2 className="text-xl font-bold">Team Management</h2>
      <div className="grid grid-cols-3 gap-4">
        <Input
          type="email"
          placeholder="New member email"
          value={newMember.email ?? ""}
          onChange={(e) =>
            setNewMember({ ...newMember, email: e.target.value })
          }
        />
        <PasswordInput
          placeholder="Password"
          value={newMember.password}
          onChange={(e) =>
            setNewMember({ ...newMember, password: e.target.value })
          }
        />
        <Select
          value={newMember.role ?? ""}
          onValueChange={(value) => setNewMember({ ...newMember, role: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleAddMember} disabled={isAdding}>
        {isAdding ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-white" />
            Adicionando...
          </span>
        ) : (
          "Adicionar Membro"
        )}
      </Button>

      <Table className="my-8 text-sm w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-left">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMembers.map((member, index) => (
            <TableRow key={index}>
              <TableCell className="py-2">{member.email}</TableCell>
              <TableCell className="py-2">
                {member.role === "admin" ? "👑" : "👤"}
              </TableCell>
              <TableCell className="py-2">
                {member.isBlocked ? "Blocked" : "Active"}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleToggleBlock(member.id, !member.isBlocked)
                    }
                  >
                    {member.isBlocked ? "Unlock" : "Block"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push("/dashboard/update-password")}
                  >
                    Update Password
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveUser(member.id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
