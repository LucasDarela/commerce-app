"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./ui/mode-toggle";
import { ThemeSelector } from "./theme-selector";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NotificationsBell from "@/components/notifications/NotificationsBell";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean).slice(1); // remove "dashboard"

  const breadcrumbs = segments.map((segment, index) => {
    const href = `/dashboard/${segments.slice(0, index + 1).join("/")}`;
    const label = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return { href, label };
  });

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <nav className="hidden md:flex text-sm text-muted-foreground items-center gap-1">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              <span className="mx-1">/</span>
              {index === breadcrumbs.length - 1 ? (
                <span className="text-foreground">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:underline">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSelector />
          <ModeToggle />
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
