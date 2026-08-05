"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayCircle, Rocket, Sparkles } from "lucide-react";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function WelcomeOnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const { user } = useAuthenticatedCompany();
  // Using useState to avoid recreation on re-renders while keeping it stable
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    // Se não tiver usuário logado, não faz nada
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    async function checkOnboardingStatus() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("has_seen_onboarding")
          .eq("id", user.id)
          .single();

        // Só mostra se explicitamente for falso ou null
        if (!error && data?.has_seen_onboarding !== true) {
          timeoutId = setTimeout(() => {
            setIsOpen(true);
          }, 800);
        }
      } catch (err) {
        console.error("Erro ao verificar onboarding:", err);
      }
    }

    checkOnboardingStatus();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, supabase]);

  const handleClose = async () => {
    if (dontShowAgain && user) {
      try {
        await supabase
          .from("profiles")
          .update({ has_seen_onboarding: true })
          .eq("id", user.id);
      } catch (err) {
        console.error("Erro ao salvar status do onboarding:", err);
      }
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-background border-none shadow-2xl max-h-[100vh] flex flex-col">
        <div className="overflow-y-auto w-full">
          <div className="relative">
            {/* Header visual */}
            <div className="h-24 sm:h-32 bg-gradient-to-br from-emerald-500 to-emerald-700 w-full flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
              <Sparkles className="absolute text-white/20 h-24 w-24 -right-4 -top-4 rotate-12" />
              <div className="bg-white/20 backdrop-blur-md p-4 rounded-full shadow-lg ring-4 ring-white/10 relative z-10">
                <Rocket className="h-10 w-10 text-white" />
              </div>
            </div>

            <div className="p-8 pt-6">
              <DialogHeader className="space-y-3 mb-6">
                <DialogTitle className="text-3xl font-bold text-center tracking-tight">
                  Bem-vindo ao Chopp Hub! 🎉
                </DialogTitle>
                <DialogDescription className="text-center text-base font-medium text-muted-foreground max-w-md mx-auto">
                  Sua distribuidora acaba de ganhar um novo aliado. Preparamos
                  um vídeo rápido para te mostrar como extrair o máximo do
                  sistema.
                </DialogDescription>
              </DialogHeader>

              <div className="relative w-full aspect-video rounded-xl bg-muted overflow-hidden border border-border shadow-sm mb-6">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/zT46fCKzn7o?si=jEOGd9YKxkClgrfZ"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dontShowAgain"
                    checked={dontShowAgain}
                    onCheckedChange={(checked) =>
                      setDontShowAgain(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="dontShowAgain"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Não me mostre mais isso (sair do modo tutorial)
                  </label>
                </div>

                <Button
                  onClick={handleClose}
                  size="lg"
                  className="w-full sm:w-auto px-8 shadow-emerald-500/20 shadow-lg"
                >
                  Começar a usar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
