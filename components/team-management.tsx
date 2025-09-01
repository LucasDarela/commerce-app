"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

type TeamMember = {
  id: string;
  email: string;
  role: string;
  isBlocked: boolean;
  emailConfirmed: boolean;
  lastSignInAt?: string | null;
  pending: boolean;
};

export default function TeamManagementPage() {
  const { user, companyId, loading } = useAuthenticatedCompany();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<
    "admin" | "normal" | null
  >(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ email: "", role: "normal" });

  async function fetchTeam() {
    try {
      const res = await fetch("/api/users/team");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao buscar time");
      setTeamMembers(data.members);
      const me = data.members.find((m: TeamMember) => m.id === user?.id);
      if (me) setCurrentUserRole((me.role as any) ?? "normal");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
    }
  }

  useEffect(() => {
    if (user?.id && companyId) fetchTeam();
  }, [user?.id, companyId]);

  async function handleAddMember() {
    if (!newMember.email) return toast.error("Preencha o e-mail.");
    setIsAdding(true);
    try {
      const res = await fetch("/api/users/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newMember.email, role: newMember.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao adicionar membro");

      toast.success("Convite enviado!");
      setNewMember({ email: "", role: "normal" });
      fetchTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleResendInvite(email: string) {
    try {
      const res = await fetch("/api/users/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Falha ao gerar link de convite");

      // copia o link para a área de transferência
      if (data.actionLink) {
        await navigator.clipboard.writeText(data.actionLink);
        toast.success(
          "Novo link de convite copiado para a área de transferência!",
        );
      } else {
        toast("Convite gerado. Verifique sua configuração de envio de e-mail.");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSendReset(email: string) {
    try {
      const res = await fetch("/api/users/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Falha ao gerar link de reset");

      if (data.actionLink) {
        await navigator.clipboard.writeText(data.actionLink);
        toast.success("Link de reset copiado para a área de transferência!");
      } else {
        toast("Reset gerado. Verifique sua configuração de envio de e-mail.");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleToggleBlock(id: string, blocked: boolean) {
    try {
      const res = await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id, blocked }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Falha ao atualizar bloqueio");

      setTeamMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isBlocked: blocked } : m)),
      );
      toast.success(blocked ? "Usuário bloqueado" : "Usuário desbloqueado");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRemoveUser(id: string, email: string) {
    if (!companyId) return;
    if (user?.id === id) {
      toast.error("Você não pode deletar a si mesmo.");
      return;
    }
    if (currentUserRole !== "admin") {
      toast.error("Apenas administradores podem deletar usuários.");
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o usuário ${email}?`,
    );

    if (!confirmed) return;
    try {
      const res = await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id, company_id: companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao remover usuário");

      setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Usuário removido da empresa");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (loading) return <div className="p-8">Carregando…</div>;

  return (
    <div className="space-y-6 py-8">
      <h2 className="text-xl font-bold">Gerencie sua Equipe</h2>

      <div className="grid grid-cols-3 gap-4">
        <Input
          type="email"
          placeholder="Digite o email do seu colaborador"
          value={newMember.email}
          onChange={(e) =>
            setNewMember({ ...newMember, email: e.target.value })
          }
        />
        <Select
          value={newMember.role}
          onValueChange={(value) =>
            setNewMember({ ...newMember, role: value as "admin" | "normal" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAddMember} disabled={isAdding}>
          {isAdding ? "Enviando..." : "Adicionar Membro"}
        </Button>
      </div>

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
          {teamMembers.map((member) => {
            const deletingSelf = user?.id === member.id;
            const canDelete = currentUserRole === "admin" && !deletingSelf;

            return (
              <TableRow key={member.id}>
                <TableCell className="py-2">{member.email}</TableCell>
                <TableCell className="py-2">
                  {member.role === "admin" ? "👑" : "👤"}
                </TableCell>
                <TableCell className="py-2">
                  {member.pending
                    ? "Pending"
                    : member.isBlocked
                      ? "Blocked"
                      : "Active"}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleToggleBlock(member.id, !member.isBlocked)
                      }
                      disabled={currentUserRole !== "admin"}
                    >
                      {member.isBlocked ? "Unlock" : "Block"}
                    </Button>

                    {member.pending ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResendInvite(member.email)}
                        disabled={currentUserRole !== "admin"}
                      >
                        Resend invite
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSendReset(member.email)}
                      >
                        Update Password
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!canDelete}
                      onClick={() => handleRemoveUser(member.id, member.email)}
                      title={
                        !canDelete
                          ? deletingSelf
                            ? "Você não pode deletar a si mesmo"
                            : "Apenas administradores podem deletar usuários"
                          : undefined
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
