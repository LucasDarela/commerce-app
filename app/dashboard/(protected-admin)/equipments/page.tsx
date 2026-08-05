"use client";

import { useEffect, useState } from "react";
import { fetchEquipments } from "@/lib/fetchEquipments";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { DataEquipments } from "@/components/data-equipments";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Wrench } from "lucide-react";

export default function EquipmentsPage() {
  const { companyId, loading } = useAuthenticatedCompany();
  const [equipments, setEquipments] = useState<Awaited<ReturnType<typeof fetchEquipments>>>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const getData = async () => {
      setIsFetching(true);

      const data = await fetchEquipments(companyId);
      setEquipments(data ?? []);
      setIsFetching(false);
    };

    getData();
  }, [companyId]);

  if (loading || isFetching) {
    return <TableSkeleton />;
  }

  if (equipments.length === 0) {
    return (
      <div className="flex flex-1 flex-col p-6 mt-3 max-w-5xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-6">Equipamentos</h2>
        <EmptyState
          icon={Wrench}
          title="Nenhum equipamento cadastrado"
          description="Controle suas chopeiras, barris, cilindros e freezers. Cadastre seu primeiro equipamento para gerenciar comodatos e manutenções."
          actionLabel="Cadastrar Equipamento"
          actionHref="/dashboard/equipments/add"
          videoUrl="https://www.youtube.com/embed/2ZJH5QYY-Fo?si=gzQu23YXVpwhfmb9"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <DataEquipments data={equipments} companyId={companyId!} />
        </div>
      </div>
    </div>
  );
}