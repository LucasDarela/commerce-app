"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
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

type UserRole = "admin" | "normal" | "driver";

type TeamMember = {
  id: string;
  email: string;
  role: UserRole | string;
  isBlocked: boolean;
  emailConfirmed: boolean;
  lastSignInAt?: string | null;
  pending: boolean;
};

export default function TeamManagementPage() {
  const supabase = createBrowserSupabaseClient();
  const { user, companyId, loading } = useAuthenticatedCompany();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState<{
    email: string;
    role: UserRole;
  }>({
    email: "",
    role: "driver",
  });
  
  const [capacity, setCapacity] = useState<{
    used: number;
    total: number;
    base: number;
    extra: number;
  } | null>(null);

  async function fetchTeam() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/users/team", {
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : {},
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao buscar time");
      }

      setTeamMembers(data.members);
      setCapacity(data.capacity);

      const me = data.members.find((m: TeamMember) => m.id === user?.id);
      if (me) {
        const normalizedRole =
          me.role === "motorista"
            ? "driver"
            : me.role === "usuario"
              ? "normal"
              : me.role;

        setCurrentUserRole((normalizedRole as UserRole) ?? "normal");
      }
    } catch (e: any) {
      console.error("[frontend][team] error:", e);
      toast.error(e.message);
    }
  }

  useEffect(() => {
    if (user?.id && companyId) {
      fetchTeam();
    }
  }, [user?.id, companyId]);

  async function handleAddMember() {
    const email = newMember.email.trim().toLowerCase();

    if (!email) {
      return toast.error("Preencha o e-mail.");
    }

    setIsAdding(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("[frontend][sessionError]:", sessionError);
      console.log("[frontend][accessToken exists]:", !!session?.access_token);
      console.log("[frontend][user]:", session?.user?.email);

      if (sessionError || !session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const res = await fetch("/api/users/add-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          role: newMember.role,
        }),
      });

      const data = await res.json();

      console.log("[frontend][add-member] status:", res.status);
      console.log("[frontend][add-member] response:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao adicionar membro");
      }

      toast.success("Convite enviado!");
      setNewMember({ email: "", role: "normal" });
      fetchTeam();
    } catch (e: any) {
      console.error("[frontend][add-member] error:", e);
      toast.error(e.message);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleResendInvite(email: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const res = await fetch("/api/users/resend-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      console.log("[frontend][resend-invite] status:", res.status);
      console.log("[frontend][resend-invite] response:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao gerar link de convite");
      }

      if (data.actionLink) {
        await navigator.clipboard.writeText(data.actionLink);
        toast.success(
          "Novo link de convite copiado para a área de transferência!",
        );
      } else {
        toast("Convite gerado. Verifique sua configuração de envio de e-mail.");
      }
    } catch (e: any) {
      console.error("[frontend][resend-invite] error:", e);
      toast.error(e.message);
    }
  }

  async function handleSendReset(email: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const res = await fetch("/api/users/send-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      console.log("[frontend][send-reset] status:", res.status);
      console.log("[frontend][send-reset] response:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao gerar link de reset");
      }

      if (data.actionLink) {
        await navigator.clipboard.writeText(data.actionLink);
        toast.success("Link de reset copiado para a área de transferência!");
      } else {
        toast("Reset gerado. Verifique sua configuração de envio de e-mail.");
      }
    } catch (e: any) {
      console.error("[frontend][send-reset] error:", e);
      toast.error(e.message);
    }
  }

  async function handleToggleBlock(id: string, blocked: boolean) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const res = await fetch("/api/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: id, blocked }),
      });

      const data = await res.json();

      console.log("[frontend][block] status:", res.status);
      console.log("[frontend][block] response:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao atualizar bloqueio");
      }

      setTeamMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isBlocked: blocked } : m)),
      );

      toast.success(blocked ? "Usuário bloqueado" : "Usuário desbloqueado");
    } catch (e: any) {
      console.error("[frontend][block] error:", e);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const res = await fetch("/api/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: id, company_id: companyId }),
      });

      const data = await res.json();

      console.log("[frontend][delete] status:", res.status);
      console.log("[frontend][delete] response:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao remover usuário");
      }

      setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Usuário removido da empresa");
    } catch (e: any) {
      console.error("[frontend][delete] error:", e);
      toast.error(e.message);
    }
  }

  if (loading) {
    return <div className="p-8">Carregando…</div>;
  }

  return (
    <div className="space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gerencie sua Equipe</h2>
        
        {capacity && (
          <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 rounded-2xl border text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-[10px] uppercase font-bold">Capacidade de Usuários</span>
              <span className="font-semibold">
                {capacity.used} de {capacity.total} utilizados
              </span>
            </div>
            <div className="h-8 w-[1px] bg-border mx-1" />
            <div className="text-[10px] text-muted-foreground max-w-[120px] leading-tight">
              {capacity.base} do plano + {capacity.extra} extras
            </div>
          </div>
        )}
      </div>

      {capacity && capacity.used >= capacity.total && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm flex items-center gap-3">
          <span>⚠️</span>
          <p>
            <strong>Limite de usuários atingido.</strong> Para adicionar novos membros, remova alguém ou contrate usuários adicionais na página de <a href="/dashboard/billing" className="underline font-bold">Cobrança</a>.
          </p>
        </div>
      )}

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
            setNewMember({
              ...newMember,
              role: value as UserRole,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Role" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="driver">Motorista</SelectItem>
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

            const normalizedMemberRole =
              member.role === "motorista"
                ? "driver"
                : member.role === "usuario"
                  ? "normal"
                  : member.role;

            return (
              <TableRow key={member.id}>
                <TableCell className="py-2">{member.email}</TableCell>

                <TableCell className="py-2">
                  {normalizedMemberRole === "admin"
                    ? "👑"
                    : normalizedMemberRole === "driver"
                      ? "🛻"
                      : "👤"}
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