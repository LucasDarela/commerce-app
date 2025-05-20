"use client"

import { useEffect, useState } from "react"

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"
import LoanByCustomerPage from "@/components/equipment-loan/equipment-loan-page"


export default function LoanPage () {
  const { companyId } = useAuthenticatedCompany()

  return (
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <LoanByCustomerPage />
            </div>
          </div>
        </div>
  )
}
