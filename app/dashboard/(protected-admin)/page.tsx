export const runtime = "nodejs";

import { SectionCards } from "@/components/dashboard/SectionCardsServer";
import ClientChart from "./ClientChart";

export default async function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ClientChart />
          </div>
        </div>
      </div>
    </div>
  );
}
