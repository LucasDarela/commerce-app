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

const data = {

  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Customers",
      url: "/dashboard/customers",
      icon: IconUsers,
    },
    {
      title: "Products",
      url: "/dashboard/products",
      icon: IconPackage,
    },
    {
      title: "Suppliers",
      url: "/dashboard/suppliers",
      icon: IconUserCog,
    },
    {
      title: "Financial",
      url: "/dashboard/financial",
      icon: IconBuildingBank,
    },
    {
      title: "Orders",
      url: "/dashboard/orders",
      icon: IconShoppingCart,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: IconChartBar,
    },
  ],

  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
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
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
      <NavUserWrapper />
      </SidebarFooter>
    </Sidebar>
  )
}
