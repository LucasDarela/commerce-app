"use client"

import { useEffect, useState } from "react"
import { fetchEquipments } from "@/lib/fetchEquipments"
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"
import { DataEquipments } from "@/components/data-equipments"
import { Equipment } from "@/components/types/equipments"

export default function EquipmentsPage() {
  const { companyId, loading } = useAuthenticatedCompany()
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    if (!companyId) return

    const getData = async () => {
      setIsFetching(true)
      const data = await fetchEquipments(companyId)
      setEquipments(data)
      setIsFetching(false)
    }

    getData()
  }, [companyId])

  if (loading || isFetching || !companyId)
    return <p className="p-4">Loading Equipments...</p>

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <DataEquipments data={equipments} companyId={companyId} />
        </div>
      </div>
    </div>
  )
}