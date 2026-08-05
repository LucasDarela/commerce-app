"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { IconReceipt, IconLock } from "@tabler/icons-react";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function TicketsPage() {
  const { planName, loading } = useAuthenticatedCompany();

  if (loading) {
    return <TableSkeleton />;
  }

  const isLimitedPlan =
    !planName ||
    planName.toLowerCase().includes("essential") ||
    planName.toLowerCase() === "gratuito";

  if (isLimitedPlan) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
            <IconLock className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Recurso Premium
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              A gestão completa e emissão de boletos direto pelo painel é um recurso exclusivo para assinantes dos planos Pro e Enterprise.
            </p>
          </div>
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6 text-sm text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Emissão de boletos em 1 clique</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Baixa automática no financeiro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Sem precisar acessar o painel do Asaas</span>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3 pt-4">
            <Button asChild size="lg" className="w-full font-bold">
              <Link href="/dashboard/billing">Fazer Upgrade</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Voltar ao início</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6 px-10 mt-9">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Gestão de Boletos</h2>
      </div>
      
      <div className="mt-8">
        <EmptyState
          icon={IconReceipt}
          title="Em Desenvolvimento 🚧"
          description="Aqui você terá total controle dos seus boletos sem precisar acessar o painel do Asaas. Emissão, 2ª via e acompanhamento de status em tempo real, tudo no mesmo lugar!"
        />
      </div>
    </div>
  );
}
