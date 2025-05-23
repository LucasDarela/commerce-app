import ReportsPage from "@/components/analytics/reportsPage";

export default function Analytics() {
  
  return (
    <div className="flex flex-1 flex-col">
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <ReportsPage />
      </div>
    </div>
  </div>
  );
}