// // app/dashboard/(admin)/page.tsx
// export const runtime = "nodejs";

// import "./_client-ref";
// import { ChartAreaInteractive } from "@/components/chart-area-interactive";
// import { SectionCards } from "@/components/dashboard/SectionCardsServer";

// export default async function DashboardPage() {
//   return (
//     <div className="flex flex-1 flex-col">
//       <div className="@container/main flex flex-1 flex-col gap-2">
//         <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
//           <SectionCards />
//           <div className="px-4 lg:px-6">
//             <ChartAreaInteractive />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// app/dashboard/(admin)/page.tsx
export const runtime = "nodejs";

import dynamic from "next/dynamic";
import ClientRef from "./_client-ref";
import { SectionCards } from "@/components/dashboard/SectionCardsServer";

const ClientChart = dynamic(() => import("./ClientChart"), { ssr: false });

export default async function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* FORÇA client reference neste segmento */}
      <ClientRef />

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
