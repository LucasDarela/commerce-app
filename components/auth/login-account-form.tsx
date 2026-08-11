"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useSearchParams } from "next/navigation";
import { PasswordInput } from "../ui/password-input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const formSchema = z.object({
  email: z
    .string({ required_error: "O e-mail é obrigatório." })
    .email("Deve ser um e-mail válido."),
  password: z
    .string({ required_error: "A senha é obrigatória." })
    .min(7, "A senha deve ter pelo menos 7 caracteres.")
    .max(15, "Limite excedido de 15 caracteres."),
});

export function LoginAccountForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Acessando...");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  const supabase = createBrowserSupabaseClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "multiple_sessions") {
      toast.error("Sua sessão expirou pois você logou em outro dispositivo.");
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error("Informe seu e-mail para redefinir a senha.");
      return;
    }

    try {
      setSendingReset(true);

      const email = resetEmail.trim().toLowerCase();

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
      });

      if (error) {
        toast.error("Erro ao enviar recuperação: " + error.message);
        return;
      }

      toast.success("E-mail de recuperação enviado com sucesso!");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error) {
      console.error("handleForgotPassword", error);
      toast.error("Erro inesperado ao enviar recuperação.");
    } finally {
      setSendingReset(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const email = values.email.trim().toLowerCase();
      const password = values.password;

      const {
        error,
        data: { user, session },
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error?.status === 429) {
        toast.error("Muitas tentativas. Tente novamente em alguns minutos.");
        return;
      }

      if (error) {
        toast.error("Erro de login: " + error.message);
        return;
      }

      if (!user || !session) {
        toast.error("Sessão não criada após o login.");
        return;
      }

      // Verifica se o usuário já tinha uma sessão ativa para dar feedback visual
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("current_session_id")
        .eq("id", user.id)
        .maybeSingle();

      // Verifica se o usuário já tinha uma sessão ativa em OUTRO dispositivo
      // Compara o session_id do banco com o cookie local do browser atual
      const localMarker = document.cookie
        .split("; ")
        .find((row) => row.startsWith("session_marker="))
        ?.split("=")[1];

      const hasOtherDeviceConnected =
        !!existingProfile?.current_session_id &&
        existingProfile.current_session_id !== localMarker;

      if (hasOtherDeviceConnected) {
        setLoadingText("Desconectando você de outro dispositivo...");
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setLoadingText("Iniciando sua sessão...");

      // ✅ Gera um identificador único para esta sessão
      const sessionMarker =
        Math.random().toString(36).substring(2) + Date.now().toString(36);

      // ✅ Grava o ID da nova sessão no banco para invalidar sessões antigas
      const { error: sessionUpdateError } = await supabase
        .from("profiles")
        .update({ current_session_id: sessionMarker })
        .eq("id", user.id);

      if (sessionUpdateError) {
        console.error("Erro ao registrar sessão:", sessionUpdateError);
      } else {
        // Força a limpeza de qualquer cookie antigo para evitar duplicação que confunda o middleware
        document.cookie = "session_marker=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        document.cookie = "session_marker=; path=/; domain=.chopphub.com; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

        // ✅ Salva o marcador localmente para o middleware validar.
        // Em produção (HTTPS) o cookie DEVE ter o atributo Secure.
        const isProduction = window.location.protocol === "https:";
        const hostname = window.location.hostname;
        const domainStr = hostname.includes("chopphub.com") ? "domain=.chopphub.com; " : "";
        const secureStr = isProduction ? "Secure; " : "";
        document.cookie = `session_marker=${sessionMarker}; path=/; max-age=2592000; SameSite=Lax; ${secureStr}${domainStr}`;
      }

      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyUserError) {
        toast.error("Erro ao identificar o tipo de usuário.");
        return;
      }

      // Adicionamos um delay para garantir que:
      // 1. A atualização do banco (current_session_id) propague antes da próxima request
      // 2. O cookie session_marker seja gravado no browser antes do redirect
      // Em produção, redes e CDNs podem adicionar latência extra, por isso 1200ms.
      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (companyUser?.role === "admin") {
        window.location.href = `/dashboard?sm=${sessionMarker}`;
        return;
      }

      if (companyUser?.role === "driver" || companyUser?.role === "normal") {
        window.location.href = `/dashboard/orders?sm=${sessionMarker}`;
        return;
      }

      window.location.href = `/dashboard?sm=${sessionMarker}`;
    } catch (error) {
      console.error("LoginAccountForm:onSubmit", error);
      toast.error("Erro inesperado ao tentar efetuar login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center space-y-2 px-6 py-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col space-y-2 w-full"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="E-mail"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Senha"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />

                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword((prev) => !prev);
                      setResetEmail(form.getValues("email") || "");
                    }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {showForgotPassword && (
                  <div className="mt-3 space-y-2 rounded-md border p-3">
                    <Input
                      type="email"
                      placeholder="Digite seu e-mail"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleForgotPassword}
                      disabled={sendingReset}
                    >
                      {sendingReset ? "Enviando..." : "Enviar recuperação"}
                    </Button>
                  </div>
                )}
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full h-11">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isLoading ? loadingText : "Acessar Plataforma"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
