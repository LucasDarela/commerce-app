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

export default function SettingsPage() {
  const { user, companyId, loading, role, planName } = useAuthenticatedCompany();
  useRouteGuard();

  if (loading) {
    return <TableSkeleton />;
  }
  if (role === "driver") return null;
  
  const isLimitedPlan = !planName || 
    planName.toLowerCase().includes("essential") || 
    planName.toLowerCase() === "gratuito";

  return (
    <div className="space-y-6 px-10 mt-9">
      <h2 className="text-2xl font-bold">Configurações</h2>
      <CompanySettingsForm />
      <TeamManagementPage />
      
      {!isLimitedPlan ? (
        <>
          <IntegrationsPage />
          <FocusNFeSection />
        </>
      ) : (
        <UpgradePlanBanner 
          title="Recursos de Boletos e Emissão de Notas Fiscais Bloqueados" 
          description="A emissão de NF-e e a integração automática de boletos são exclusivas para assinantes dos planos Pro e Enterprise. Organize sua operação e economize tempo agora mesmo!"
        />
      )}

      <RegisterBankAccount />
      {/* Em desenvolvimento */}
      {/* <PaymentSettingsCard /> */}
    </div>
  );
}
