"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Páginas do dashboard que queremos rastrear (mapeadas para nomes legíveis)
const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard Principal",
  "/dashboard/billing": "Faturamento / Planos",
  "/dashboard/account": "Conta",
  "/dashboard/notifications": "Notificações",
  "/dashboard/help": "Ajuda",
};

function getPageLabel(pathname: string): string {
  // Match exato primeiro
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];

  // Match por prefixo
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const section = segments[1];
    return section
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  return pathname;
}

export function PageTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Evita rastrear a mesma rota duas vezes seguidas
    if (lastTrackedPath.current === pathname) return;

    // Ignora rotas que não são do dashboard
    if (!pathname.startsWith("/dashboard")) return;

    // Debounce de 500ms para não disparar em navegações rápidas
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        lastTrackedPath.current = pathname;

        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "page_view",
            event_name: pathname,
            metadata: {
              label: getPageLabel(pathname),
              referrer: typeof document !== "undefined" ? document.referrer : null,
            },
          }),
        });
      } catch {
        // Falha silenciosa — analytics não deve quebrar a UX
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [pathname]);

  // Componente invisível — só executa o efeito
  return null;
}
