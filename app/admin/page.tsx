import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, Activity } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Verificação de segurança (double-check após o middleware)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const isSuperAdmin = user.user_metadata?.is_super_admin || user.app_metadata?.is_super_admin;
  if (!isSuperAdmin) {
    redirect("/login?error=unauthorized");
  }

  // Busca algumas métricas básicas para o painel
  const { count: companiesCount } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });

  const { count: usersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: subscriptionsCount } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Painel de Controle (Super Admin)</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={async () => {
            "use server";
            const sb = await createServerSupabaseClient();
            await sb.auth.signOut();
            redirect("/login");
          }}>Sair do Painel</Button>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-muted-foreground">
          Bem-vindo de volta, <strong>{user.user_metadata?.name || user.email}</strong>. Aqui você tem visão completa sobre o Chopp Hub.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companiesCount || 0}</div>
            <p className="text-xs text-muted-foreground">Empresas cadastradas na plataforma</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount || 0}</div>
            <p className="text-xs text-muted-foreground">Perfis criados em todo o sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Clientes pagantes via Stripe</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">Online</div>
            <p className="text-xs text-muted-foreground">Tudo operando normalmente</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
