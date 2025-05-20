"use client"

import * as React from "react"
import NavUserWrapper from "@/components/nav-user-wrapper"
import Link from "next/link"
import { CompanyBrand } from "@/components/company-brand"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconShoppingCart,
  IconPackage,
  IconBeerFilled,
  IconUserCog,
  IconInvoice,
  IconCalendarSmile,
  IconBuildingBank,
  IconBarrel,
  IconRefresh,
  IconCirclePlusFilled,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import NavDocumentsSidebar from "./nav-documents-sidebar"

const data = {
  navMainTop: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Clientes",
      url: "/dashboard/customers",
      icon: IconUsers,
    },
    {
      title: "Fornecedores",
      url: "/dashboard/suppliers",
      icon: IconUserCog,
    },
    {
      title: "Financeiro",
      url: "/dashboard/financial",
      icon: IconBuildingBank,
    },
    {
      title: "Produtos",
      url: "/dashboard/products",
      icon: IconPackage,
    },
    {
      title: "Equipamentos",
      url: "/dashboard/equipments",
      icon: IconBarrel,
    },
  ],
  navMainBottom: [
    {
      title: "Vendas",
      url: "/dashboard/orders",
      icon: IconShoppingCart,
    },
    {
      title: "Comodatos",
      url: "/dashboard/loan",
      icon: IconRefresh,
    },
    {
      title: "Relatórios",
      url: "/dashboard/analytics",
      icon: IconChartBar,
    },
  ],
  navSecondary: [
    {
      title: "Configurações",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Ajuda",
      url: "/dashboard/help",
      icon: IconHelp,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
            <a href="#">
              <CompanyBrand />
            </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
  <SidebarMenu className="mt-2 px-2">
  <SidebarMenuItem className="flex items-center gap-2">
          <Link className="w-full" href="/dashboard/orders">
            <SidebarMenuButton
              tooltip="Quick Action"
              className="bg-primary -mb-2 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Ação Rápida</span>
            </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
  </SidebarMenu>
  <NavMain items={data.navMainTop} />
  <div className="my-2 h-px bg-border shrink-0" />
  <NavMain items={data.navMainBottom} />

  <NavDocumentsSidebar />
  <NavSecondary items={data.navSecondary} className="mt-auto" />
</SidebarContent>
      <SidebarFooter>
      <NavUserWrapper />
      </SidebarFooter>
    </Sidebar>
  )
}
