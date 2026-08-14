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
    return <div className="p-8 text-muted-foreground text-sm">Carregando equipe…</div>;
  }

  const atLimit = capacity ? capacity.used >= capacity.total : false;
  const usagePercent = capacity ? Math.min((capacity.used / capacity.total) * 100, 100) : 0;

  return (
    <div className="space-y-5">

      {/* ── Capacidade: dois cards lado a lado ────────────────────────── */}
      {capacity && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Card de uso */}
          <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 px-5 py-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Capacidade de Usuários
            </span>
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-bold leading-none">{capacity.used}</span>
              <span className="text-sm text-muted-foreground mb-0.5">de {capacity.total}</span>
            </div>
            {/* Barra de progresso */}
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${atLimit ? "bg-amber-400" : "bg-primary"}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {capacity.base} do plano + {capacity.extra} extras
            </span>
          </div>

          {/* Card de aviso (sempre visível se atLimit, senão exibe "ok") */}
          {atLimit ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-800">
              <span className="text-xl mt-0.5">⚠️</span>
              <div className="text-sm">
                <p className="font-semibold mb-0.5">Limite atingido</p>
                <p className="text-amber-700 leading-snug">
                  Remova alguém ou contrate extras na{" "}
                  <a href="/dashboard/billing" className="underline font-bold">
                    página de Cobrança
                  </a>
                  .
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-800">
              <span className="text-xl mt-0.5">✅</span>
              <div className="text-sm">
                <p className="font-semibold mb-0.5">Vagas disponíveis</p>
                <p className="text-green-700 leading-snug">
                  Você ainda pode adicionar{" "}
                  <strong>{capacity.total - capacity.used}</strong> membro
                  {capacity.total - capacity.used !== 1 ? "s" : ""}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formulário de adição ───────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Convidar novo membro</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="email@colaborador.com"
            value={newMember.email}
            onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
            className="flex-1"
          />

          <Select
            value={newMember.role}
            onValueChange={(value) =>
              setNewMember({ ...newMember, role: value as UserRole })
            }
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">👑 Admin</SelectItem>
              <SelectItem value="normal">👤 Normal</SelectItem>
              <SelectItem value="driver">🛻 Motorista</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddMember} disabled={isAdding || atLimit} className="shrink-0">
            {isAdding ? "Enviando…" : "Adicionar"}
          </Button>
        </div>
      </div>

      {/* ── Tabela de membros ─────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden">
        <Table className="text-sm w-full">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-left pl-4">Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Ações</TableHead>
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

              const roleLabel =
                normalizedMemberRole === "admin"
                  ? { icon: "👑", label: "Admin",     cls: "bg-purple-100 text-purple-800" }
                  : normalizedMemberRole === "driver"
                    ? { icon: "🛻", label: "Motorista", cls: "bg-blue-100 text-blue-800" }
                    : { icon: "👤", label: "Normal",    cls: "bg-muted text-muted-foreground" };

              const statusLabel = member.pending
                ? { label: "Pendente",    cls: "bg-amber-100 text-amber-800" }
                : member.isBlocked
                  ? { label: "Bloqueado",   cls: "bg-red-100 text-red-800" }
                  : { label: "Ativo",       cls: "bg-green-100 text-green-800" };

              return (
                <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3 pl-4 font-medium">
                    {member.email}
                    {deletingSelf && (
                      <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                        você
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleLabel.cls}`}>
                      {roleLabel.icon} {roleLabel.label}
                    </span>
                  </TableCell>

                  <TableCell className="py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusLabel.cls}`}>
                      {statusLabel.label}
                    </span>
                  </TableCell>

                  <TableCell className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleBlock(member.id, !member.isBlocked)}
                        disabled={currentUserRole !== "admin"}
                      >
                        {member.isBlocked ? "Desbloquear" : "Bloquear"}
                      </Button>

                      {member.pending ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResendInvite(member.email)}
                          disabled={currentUserRole !== "admin"}
                        >
                          Reenviar convite
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSendReset(member.email)}
                        >
                          Redefinir senha
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
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {teamMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum membro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

