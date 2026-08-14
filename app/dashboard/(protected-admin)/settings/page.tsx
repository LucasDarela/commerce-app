"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import TeamManagementPage from "@/components/team-management";
import CompanySettingsForm from "@/components/company_settings";
import IntegrationsPage from "./integrations/page";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import RegisterBankAccount from "../register-bank-account/page";
import FocusNFeSection from "@/components/nf/FocusNfeSection";
import PaymentSettingsCard from "@/components/settings/PaymentSettingsCard";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { UpgradePlanBanner } from "@/components/settings/UpgradePlanBanner";
import ManualStockAdjustment from "@/components/settings/ManualStockAdjustment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Users, Landmark, FileText, Package } from "lucide-react";

const TABS = [
  { value: "geral", label: "Geral", icon: Building2 },
  { value: "equipe", label: "Equipe", icon: Users },
  { value: "financeiro", label: "Financeiro", icon: Landmark },
  { value: "fiscal", label: "Fiscal / NF-e", icon: FileText },
  { value: "estoque", label: "Estoque", icon: Package },
];

export default function SettingsPage() {
  const { loading, role, planName } = useAuthenticatedCompany();
  useRouteGuard();

  if (loading) return <TableSkeleton />;
  if (role === "driver") return null;

  const isLimitedPlan =
    !planName ||
    planName.toLowerCase().includes("essential") ||
    planName.toLowerCase() === "gratuito";

  return (
    <div className="px-6 md:px-10 mt-9 pb-16 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as configurações da sua empresa, equipe, integrações e muito
          mais.
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        {/* ── Tab triggers ─────────────────────────────────────────────── */}
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 bg-muted rounded-xl mb-2">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm"
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Geral ─────────────────────────────────────────────────────── */}
        <TabsContent value="geral" className="space-y-6 mt-4">
          <SectionHeader
            title="Dados da Empresa"
            description="Informações cadastrais, logotipo e dados de contato."
          />
          <CompanySettingsForm />
        </TabsContent>

        {/* ── Equipe ────────────────────────────────────────────────────── */}
        <TabsContent value="equipe" className="space-y-6 mt-4">
          <SectionHeader
            title="Gestão de Equipe"
            description="Convide membros, defina funções e gerencie permissões de acesso."
          />
          <TeamManagementPage />
        </TabsContent>

        {/* ── Financeiro ───────────────────────────────────────────────── */}
        <TabsContent value="financeiro" className="space-y-6 mt-4">
          <SectionHeader
            title="Integrações de Boleto"
            description="Conecte sua conta do Asaas ou Banco Inter para geração automática de boletos."
          />
          {isLimitedPlan ? (
            <UpgradePlanBanner
              title="Integração de Boletos Bloqueada"
              description="A integração automática de boletos é exclusiva para assinantes dos planos Pro e Enterprise."
            />
          ) : (
            <IntegrationsPage />
          )}

          <Divider />

          <SectionHeader
            title="Formas de Pagamento"
            description="Configure os métodos aceitos e prazos de vencimento de boleto."
          />
          <PaymentSettingsCard />

          <Divider />

          {/* Conta bancária em accordion — usada raramente */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem
              value="bank-account"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  Registrar Conta Bancária
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-1">
                <p className="text-sm text-muted-foreground mb-4">
                  Dados bancários da empresa utilizados em documentos e
                  relatórios.
                </p>
                <RegisterBankAccount />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ── Fiscal ───────────────────────────────────────────────────── */}
        <TabsContent value="fiscal" className="space-y-6 mt-4">
          <SectionHeader
            title="Nota Fiscal Eletrônica (NF-e)"
            description="Configure a emissão de NF-e via Focus NFe para seus pedidos."
          />
          {isLimitedPlan ? (
            <UpgradePlanBanner
              title="Emissão de NF-e Bloqueada"
              description="A emissão de NF-e é exclusiva para assinantes dos planos Pro e Enterprise."
            />
          ) : (
            <FocusNFeSection />
          )}
        </TabsContent>

        {/* ── Estoque ──────────────────────────────────────────────────── */}
        <TabsContent value="estoque" className="space-y-6 mt-4">
          <SectionHeader
            title="Ajuste Manual de Estoque"
            description="Corrija quantidades em estoque manualmente para itens com divergências."
          />
          <ManualStockAdjustment />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function Divider() {
  return <hr className="border-border" />;
}
