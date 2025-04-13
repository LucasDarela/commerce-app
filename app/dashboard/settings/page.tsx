"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import TeamManagementPage from "@/components/team-management";

export default function SettingsPage() {
  const { user, companyId } = useAuthenticatedCompany();

  return (
    <div className="space-y-6 p-8">
            <h2 className="text-xl font-bold">Configurações</h2>
            <p>🚧 Em desenvolvimento... 🚧</p>
    </div>
  );
}
