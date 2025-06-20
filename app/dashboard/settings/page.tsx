"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import TeamManagementPage from "@/components/team-management";
import CompanySettingsForm from "@/components/company_settings";
import IntegrationsPage from "./integrations/page";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function SettingsPage() {
  const { user, companyId, loading } = useAuthenticatedCompany();

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6 p-8">
      <h2 className="text-2xl font-bold">Configurações</h2>
      <CompanySettingsForm />
      <IntegrationsPage />
    </div>
  );
}
