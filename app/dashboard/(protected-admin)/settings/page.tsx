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

export default function SettingsPage() {
  const { user, companyId, loading, role } = useAuthenticatedCompany();
  useRouteGuard();

  if (loading) {
    return <TableSkeleton />;
  }
  if (role === "motorista") return null;
  
  return (
    <div className="space-y-6 px-10 mt-9">
      <h2 className="text-2xl font-bold">Configurações</h2>
      <CompanySettingsForm />
      <TeamManagementPage />
      <IntegrationsPage />
      <FocusNFeSection />
      <RegisterBankAccount />
      <PaymentSettingsCard />
    </div>
  );
}
