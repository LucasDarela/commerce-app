import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, Calendar, Building, CreditCard, Users, ShieldAlert, Activity, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleFilter } from "../../components/role-filter";

export default async function CompanyDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const companyId = resolvedParams.companyId;

  // Verificação de segurança
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
  if (!isSuperAdmin) redirect("/login?error=unauthorized");

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Busca dados da empresa, assinatura, perfis atrelados a ela, e usuários do auth
  const [
    { data: company },
    { data: subscription },
    { data: profiles },
    { data: { users: authUsers } },
    { data: recentEvents },
  ] = await Promise.all([
    adminClient.from("companies").select("*").eq("id", companyId).single(),
    adminClient.from("subscriptions").select("*").eq("company_id", companyId).single(),
    adminClient.from("profiles").select("*").eq("company_id", companyId),
    adminClient.auth.admin.listUsers(),
    adminClient
      .from("user_events")
      .select("event_name, event_type, metadata, created_at, user_id")
      .eq("company_id", companyId)
      .eq("event_type", "page_view")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (!company) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Empresa não encontrada.
      </div>
    );
  }

  // Identifica o dono e os funcionários convidados baseado na ordem de criação
  const companyAuthUsers = authUsers.filter(u => 
    profiles?.some(p => p.id === u.id)
  );

  // Ordena os usuários do mais antigo para o mais novo
  companyAuthUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // O dono é sempre a primeira pessoa que existiu na empresa
  const ownerProfile = companyAuthUsers.length > 0 ? companyAuthUsers[0] : undefined;
  
  // Todo o resto é funcionário/convidado (independente da role)
  let invitedProfiles = companyAuthUsers.slice(1);

  // Filtro de Role
  const roleFilter = resolvedSearchParams.role?.toLowerCase();
  if (roleFilter && roleFilter !== "all") {
    invitedProfiles = invitedProfiles.filter(u => {
      const uRole = (u.user_metadata?.invited_role || "normal").toLowerCase();
      // O filtro vai tentar fazer match nas substrings (ex: 'admin' no uRole, 'driver', 'normal' ou 'membro')
      if (roleFilter === "normal") {
        return uRole.includes("normal") || uRole.includes("membro");
      }
      return uRole.includes(roleFilter);
    });
  }

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  const statusMap: Record<string, string> = {
    active: "Pagante (Ativa)",
    trialing: "Período de Testes",
    canceled: "Cancelada",
    incomplete: "Pagamento Pendente",
    incomplete_expired: "Pagamento Expirado",
    past_due: "Pagamento Atrasado"
  };

  // --- Processa dados de analytics ---

  // Top páginas visitadas
  const pageCount: Record<string, { count: number; label: string }> = {};
  for (const ev of recentEvents || []) {
    const key = ev.event_name as string;
    const label = (ev.metadata as any)?.label || key;
    if (!pageCount[key]) pageCount[key] = { count: 0, label };
    pageCount[key].count++;
  }
  const topPages = Object.entries(pageCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  const maxPageCount = topPages[0]?.[1].count || 1;

  // Heatmap semanal (quantos acessos por dia da semana)
  const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekdayCount = new Array(7).fill(0);
  for (const ev of recentEvents || []) {
    const day = new Date(ev.created_at as string).getDay();
    weekdayCount[day]++;
  }
  const maxWeekdayCount = Math.max(...weekdayCount, 1);

  // Últimos 20 eventos para timeline
  const recentTimeline = (recentEvents || []).slice(0, 20);

  const formatDateTime = (dateStr: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));

  const totalEvents = recentEvents?.length || 0;
  const lastActivity = recentEvents?.[0]?.created_at;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 pb-20 max-w-[1000px] mx-auto">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <Button variant="outline" size="icon" className="border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">{company.name}</h2>
          <p className="text-neutral-400 mt-1 flex items-center gap-2">
            <Building className="w-4 h-4" /> CNPJ: {company.document || "Não informado"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card do Proprietário */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" /> 
              Titular da Conta (Owner)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownerProfile ? (
              <>
                <div className="flex items-center gap-3 text-neutral-300">
                  <Mail className="w-4 h-4 text-neutral-500" />
                  <span>{ownerProfile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <Phone className="w-4 h-4 text-neutral-500" />
                  <span>{profiles?.find(p => p.id === ownerProfile.id)?.phone || ownerProfile.phone || "Sem telefone"}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <span>Criado em: {formatDate(ownerProfile.created_at)}</span>
                </div>
              </>
            ) : (
              <p className="text-neutral-500">Titular não identificado (pode ser uma conta legada).</p>
            )}
          </CardContent>
        </Card>

        {/* Card de Assinatura */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" /> 
              Status no Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription ? (
              <>
                <div className="flex items-center gap-3 text-neutral-300">
                  <span className="text-neutral-500 w-24">Status:</span>
                  <Badge variant="outline" className={
                    subscription.status === 'active' ? 'text-emerald-400 border-emerald-400' :
                    subscription.status === 'trialing' ? 'text-blue-400 border-blue-400' :
                    'text-orange-400 border-orange-400'
                  }>
                    {statusMap[subscription.status] || subscription.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <span className="text-neutral-500 w-24">Stripe ID:</span>
                  <span className="font-mono text-sm">{subscription.stripe_subscription_id || "N/A"}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <span className="text-neutral-500 w-24">Customer:</span>
                  <span className="font-mono text-sm">{subscription.stripe_customer_id || "N/A"}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="w-fit text-orange-500 border-orange-500">Checkout Abandonado</Badge>
                <p className="text-sm text-neutral-500 mt-2">Nenhum registro de assinatura encontrado no banco de dados.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== SEÇÃO DE ANALYTICS ===== */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Atividade do Usuário
          </h3>
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            <span>{totalEvents} acessos registrados</span>
            {lastActivity && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Último: {formatDateTime(lastActivity as string)}
              </span>
            )}
          </div>
        </div>

        {totalEvents === 0 ? (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="py-10 text-center text-neutral-500">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum acesso registrado ainda.</p>
              <p className="text-xs mt-1">Os dados aparecerão conforme o usuário navegar pelo sistema.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Páginas */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Páginas Mais Visitadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topPages.length === 0 ? (
                  <p className="text-neutral-500 text-sm">Sem dados ainda.</p>
                ) : (
                  topPages.map(([path, { count, label }]) => (
                    <div key={path} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-300 truncate max-w-[200px]" title={label}>{label}</span>
                        <span className="text-neutral-500 shrink-0 ml-2">{count}x</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${(count / maxPageCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Heatmap por dia da semana */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Atividade por Dia da Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-24">
                  {DAY_NAMES.map((day, i) => {
                    const pct = weekdayCount[i] / maxWeekdayCount;
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm bg-purple-500/80 transition-all"
                          style={{ height: `${Math.max(pct * 80, 4)}px`, opacity: 0.4 + pct * 0.6 }}
                          title={`${weekdayCount[i]} acessos`}
                        />
                        <span className="text-[10px] text-neutral-500">{day}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-500 mt-3 text-center">
                  Baseado nos últimos {totalEvents} acessos registrados
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline de atividade recente */}
        {recentTimeline.length > 0 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                Últimas Atividades (20 mais recentes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {recentTimeline.map((ev, i) => {
                  const label = (ev.metadata as any)?.label || ev.event_name;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-neutral-300 truncate max-w-[340px]" title={ev.event_name as string}>{label}</span>
                      </div>
                      <span className="text-neutral-500 shrink-0 ml-4 text-xs">
                        {formatDateTime(ev.created_at as string)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* ===== FIM ANALYTICS ===== */}

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-neutral-400" /> Funcionários Convidados
          </h3>
          <RoleFilter />
        </div>
        <div className="rounded-md border border-neutral-800 bg-neutral-900 overflow-hidden">
          <Table>
            <TableHeader className="bg-neutral-950/50">
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400">E-mail</TableHead>
                <TableHead className="text-neutral-400">Telefone</TableHead>
                <TableHead className="text-neutral-400">Papel (Role)</TableHead>
                <TableHead className="text-neutral-400">Data do Convite</TableHead>
                <TableHead className="text-neutral-400">Último Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitedProfiles.map((u) => {
                const pInfo = profiles?.find(p => p.id === u.id);
                const roleName = u.user_metadata?.invited_role || "Membro";
                
                return (
                  <TableRow key={u.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                    <TableCell className="font-medium text-neutral-300">{u.email}</TableCell>
                    <TableCell className="text-neutral-400">{pInfo?.phone || u.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`bg-neutral-800 border-neutral-700 ${roleName.toLowerCase().includes('admin') ? 'text-orange-400' : 'text-neutral-300'}`}>
                        {roleName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-400">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-neutral-400">{formatDate(u.last_sign_in_at)}</TableCell>
                  </TableRow>
                );
              })}
              {invitedProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-neutral-500">
                    {roleFilter ? "Nenhum funcionário encontrado com esse papel." : "Nenhum funcionário foi convidado por essa empresa ainda."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
