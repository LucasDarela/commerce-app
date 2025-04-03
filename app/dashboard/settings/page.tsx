"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import TeamManagementPage from "@/components/team-management";
import BankManagement from "@/components/bank-management";

export default function SettingsPage() {
  const { user, companyId } = useAuthenticatedCompany();

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">General Settings</h1>
    <TeamManagementPage />
    <BankManagement />
    </div>
  );
}
