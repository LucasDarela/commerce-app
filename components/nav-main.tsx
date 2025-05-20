"use client"

import Link from "next/link"
import type { Icon } from "@tabler/icons-react"
import { IconCirclePlusFilled, IconMail } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type NavItem = {
  title: string
  url: string
  icon?: React.ComponentType<React.ComponentProps<Icon>>
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton tooltip={item.title} asChild>
              <Link href={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
