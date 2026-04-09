"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SessionWatcher() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let channel: any;

    async function setupWatcher() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("[SessionWatcher] Usuário não encontrado.");
        return;
      }

      console.log("[SessionWatcher] Iniciando monitoramento para o usuário:", user.id);

      // 1. Pega o marcador da sessão atual nos cookies
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
      };

      const currentMarker = getCookie("session_marker");
      console.log("[SessionWatcher] Marcador local:", currentMarker);

      // 2. Escuta mudanças na tabela profiles para este usuário
      channel = supabase
        .channel(`session_check_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            console.log("[SessionWatcher] Evento recebido do Supabase:", payload);
            const newMarker = payload.new.current_session_id;
            
            console.log("[SessionWatcher] Comparando markers:", { local: currentMarker, banco: newMarker });

            if (newMarker && newMarker !== currentMarker) {
              console.log("[SessionWatcher] Diferença detectada! Deslogando...");
              
              supabase.auth.signOut().then(() => {
                document.cookie = "session_marker=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                window.location.href = "/login-signin?error=multiple_sessions";
              });
            }
          }
        )
        .subscribe((status: string) => {
          console.log("[SessionWatcher] Status da conexão Realtime:", status);
        });
    }

    setupWatcher();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null; // Componente invisível
}
