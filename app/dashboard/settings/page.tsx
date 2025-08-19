"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import TeamManagementPage from "@/components/team-management";
import CompanySettingsForm from "@/components/company_settings";
import IntegrationsPage from "./integrations/page";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import RegisterBankAccount from "../register-bank-account/page";

export default function SettingsPage() {
  const { user, companyId, loading } = useAuthenticatedCompany();

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6 px-6 mt-9">
      <h2 className="text-2xl font-bold">Configurações</h2>
      <CompanySettingsForm />
      <TeamManagementPage />
      <IntegrationsPage />
      <RegisterBankAccount />
    </div>
  );
}
