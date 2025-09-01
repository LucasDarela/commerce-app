"use client";

import dynamic from "next/dynamic";

const Chart = dynamic(
  () =>
    import("@/components/chart-area-interactive").then(
      (m) => m.ChartAreaInteractive,
    ),
  { ssr: false },
);

export default function ClientChart() {
  return <Chart />;
}
