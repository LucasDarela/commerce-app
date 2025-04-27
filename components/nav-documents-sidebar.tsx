
import React from "react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { IconCopyPlus } from "@tabler/icons-react"

export default function NavDocumentsSidebar() {
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)

    const toggleDropdown = (key: string) => {
    setOpenDropdown((prev) => (prev === key ? null : key))
    }
    
    return(    
      <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => toggleDropdown("more")}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <IconCopyPlus size={18} />
              <span>Mais</span>
            </div>
            <span className="text-xs">{openDropdown === "more" ? "−" : "+"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {openDropdown === "more" && (
          <div className="ml-6 mt-1 space-y-1">
                        <Link
              href="/dashboard/barrel-control"
              className="block text-sm text-muted-foreground hover:text-foreground transition"
            >
              Controle de Barril
            </Link>
            <Link
              href="/dashboard/price-tables"
              className="block text-sm text-muted-foreground hover:text-foreground transition"
            >
              Tabela de Preços
            </Link>
            <Link
              href="/dashboard/register-bank-account"
              className="block text-sm text-muted-foreground hover:text-foreground transition"
            >
              Contas Bancárias
            </Link>
            <Link
              href="/dashboard/team-management"
              className="block text-sm text-muted-foreground hover:text-foreground transition"
            >
              Usuários
            </Link>
          </div>
        )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
    )
}