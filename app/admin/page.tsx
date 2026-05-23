import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, Activity, ExternalLink, MessageCircle, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AdminSearch } from "./components/admin-search";
import { StatusFilter } from "./components/status-filter";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  
  // Await do searchParams (obrigatório no Next.js 15+)
  const resolvedParams = await searchParams;

  // Verificação de segurança
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
  if (!isSuperAdmin) {
    redirect("/login?error=unauthorized");
  }

  // Instancia admin client
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Busca todas as coleções necessárias
  const [
    { data: { users: authUsers } },
    { data: profiles },
    { data: subscriptions },
    { data: companies },
  ] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    adminClient.from("profiles").select("*"),
    adminClient.from("subscriptions").select("*"),
    adminClient.from("companies").select("*"),
  ]);

  // Identifica o dono real de cada empresa (o usuário mais antigo daquela company_id)
  const ownerIds = new Set<string>();
  
  if (companies && profiles && authUsers) {
    companies.forEach((company) => {
      const companyProfiles = profiles.filter((p) => p.company_id === company.id);
      if (companyProfiles.length === 0) return;

      const usersInCompany = companyProfiles
        .map((p) => authUsers.find((u) => u.id === p.id))
        .filter(Boolean) as typeof authUsers;

      if (usersInCompany.length > 0) {
        usersInCompany.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        ownerIds.add(usersInCompany[0].id);
      }
    });
  }

  // Variáveis para as novas KPIs
  let trialsCount = 0;
  let activeCount = 0;
  let abandonedCount = 0;

  // Cruza os dados e filtra estritamente os donos originais
  let enrichedUsers = (authUsers || [])
    .filter((authUser) => ownerIds.has(authUser.id))
    .map((authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      const subscription = subscriptions?.find((s) => s.company_id === profile?.company_id);
      const company = companies?.find((c) => c.id === profile?.company_id);

      const status = subscription?.status || "abandoned";
      
      // Contabilizando KPIs globais
      if (status === "active") activeCount++;
      if (status === "trialing") trialsCount++;
      if (status === "abandoned" || status === "incomplete" || status === "incomplete_expired") abandonedCount++;

      // Formata o número de telefone para o link do WhatsApp
      const rawPhone = profile?.phone || authUser.phone || "";
      const whatsappNumber = rawPhone.replace(/\D/g, ""); // Remove tudo que não for número

      return {
        id: authUser.id,
        email: authUser.email,
        phone: rawPhone || "Não informado",
        whatsappNumber,
        createdAt: authUser.created_at ? new Date(authUser.created_at) : null,
        lastLogin: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null,
        stripeSubscriptionId: subscription?.stripe_subscription_id,
        stripeCustomerId: subscription?.stripe_customer_id,
        status: status === "incomplete" ? "abandoned" : status, // normaliza o incomplete para abandoned
        companyName: company?.name || "Sem Empresa",
        companyId: company?.id,
      };
    }).sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  // Filtro de busca de texto (q)
  const q = resolvedParams.q?.toLowerCase();
  if (q) {
    enrichedUsers = enrichedUsers.filter(u => 
      u.email?.toLowerCase().includes(q) || 
      u.companyName?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  }

  // Filtro de Status Financeiro
  const statusFilter = resolvedParams.status?.toLowerCase();
  if (statusFilter && statusFilter !== "all") {
    enrichedUsers = enrichedUsers.filter(u => u.status === statusFilter);
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string, hasStripeId: boolean) => {
    if (status === "active") return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Pagante</Badge>;
    if (status === "trialing") return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Trial</Badge>;
    if (status === "canceled") return <Badge variant="destructive">Cancelado</Badge>;
    if (status === "abandoned" || !hasStripeId) return <Badge variant="outline" className="text-orange-500 border-orange-500 hover:bg-orange-500/10">Abandono</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  // Regra: Verifica se o último login foi há mais de 15 dias
  const isInactive = (lastLogin: Date | null, status: string) => {
    if (!lastLogin || status !== "active") return false;
    const daysSinceLastLogin = (new Date().getTime() - lastLogin.getTime()) / (1000 * 3600 * 24);
    return daysSinceLastLogin > 15;
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 pb-20 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Painel de Controle</h2>
          <p className="text-neutral-400 mt-1">
            Visão gerencial de clientes, faturamento e recuperação de vendas.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800" onClick={async () => {
            "use server";
            const sb = await createServerSupabaseClient();
            await sb.auth.signOut();
            redirect("/login");
          }}>Sair do Painel</Button>
        </div>
      </div>

      {/* KPIs Focados em CRM / Oportunidade */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{companies?.length || 0}</div>
            <p className="text-xs text-neutral-500 mt-1">Contas globais criadas</p>
          </CardContent>
        </Card>
        
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Assinaturas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
            <p className="text-xs text-neutral-500 mt-1">Clientes recorrentes faturando</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Trials Ativos</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{trialsCount}</div>
            <p className="text-xs text-neutral-500 mt-1">Testando grátis no momento</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Checkouts Abandonados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{abandonedCount}</div>
            <p className="text-xs text-neutral-500 mt-1">Contas sem método de pagamento</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-white">Clientes (Proprietários)</h3>
          <div className="flex items-center gap-3">
            <StatusFilter />
            <AdminSearch />
          </div>
        </div>
        
        <div className="rounded-md border border-neutral-800 bg-neutral-900 overflow-hidden">
          <Table>
            <TableHeader className="bg-neutral-950/50">
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400">Empresa</TableHead>
                <TableHead className="text-neutral-400">E-mail</TableHead>
                <TableHead className="text-neutral-400">Telefone</TableHead>
                <TableHead className="text-neutral-400">Criação da Conta</TableHead>
                <TableHead className="text-neutral-400">Último Login</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-neutral-400 text-right">Ações Rápidas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedUsers.map((u) => {
                const idleWarning = isInactive(u.lastLogin, u.status);
                
                return (
                  <TableRow key={u.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors cursor-pointer group">
                    <TableCell className="font-medium text-neutral-200">
                      {u.companyId ? (
                        <Link href={`/company/${u.companyId}`} className="hover:underline flex items-center gap-2">
                          {u.companyName}
                        </Link>
                      ) : (
                        <span className="text-neutral-500">{u.companyName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-neutral-300">{u.email}</TableCell>
                    <TableCell className="text-neutral-400">{u.phone}</TableCell>
                    <TableCell className="text-neutral-400">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className={`${idleWarning ? 'text-red-400 font-medium flex items-center gap-1' : 'text-neutral-400'}`}>
                      {idleWarning && <AlertTriangle className="w-3 h-3 inline-block" />}
                      {formatDate(u.lastLogin)}
                    </TableCell>
                    <TableCell>{getStatusBadge(u.status, !!u.stripeSubscriptionId)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.whatsappNumber && u.whatsappNumber.length >= 10 && (
                          <Link 
                            href={`https://wa.me/55${u.whatsappNumber}`} 
                            target="_blank" 
                            title="Chamar no WhatsApp"
                          >
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {u.stripeCustomerId ? (
                          <Link 
                            href={`https://dashboard.stripe.com/customers/${u.stripeCustomerId}`} 
                            target="_blank" 
                            title="Ver no Stripe Dashboard"
                          >
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        ) : (
                           <div className="w-8" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {enrichedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-neutral-500">
                    Nenhum cliente encontrado com os filtros atuais.
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
