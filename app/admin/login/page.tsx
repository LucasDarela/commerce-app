"use client";

import { useState } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { PasswordInput } from "@/components/ui/password-input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const formSchema = z.object({
  email: z
    .string({ required_error: "O e-mail é obrigatório." })
    .email("Deve ser um e-mail válido."),
  password: z
    .string({ required_error: "A senha é obrigatória." })
    .min(7, "A senha deve ter pelo menos 7 caracteres."),
});

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "unauthorized") {
      toast.error("Acesso negado. Você não tem privilégios de Super Admin.");
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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

      if (error) {
        toast.error("Erro de login: " + error.message);
        return;
      }

      if (!user || !session) {
        toast.error("Sessão não criada após o login.");
        return;
      }

      // Verifica se é super admin nos metadados
      const isSuperAdmin = user.user_metadata?.is_super_admin || user.app_metadata?.is_super_admin;

      if (!isSuperAdmin) {
        toast.error("Acesso negado. Você não é um Super Admin.");
        await supabase.auth.signOut();
        return;
      }

      toast.success("Bem-vindo ao Painel Administrativo!");
      window.location.href = "/";
    } catch (error) {
      console.error("AdminLoginError", error);
      toast.error("Erro inesperado ao tentar efetuar login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-[400px] space-y-6 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="bg-orange-100 dark:bg-orange-950/30 p-3 rounded-full mb-2">
            <ShieldCheck className="h-8 w-8 text-orange-600 dark:text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Chopp Hub</h1>
          <p className="text-sm text-muted-foreground">
            Acesso restrito para administradores do sistema.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail Corporativo</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="admin@chopphub.com"
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
                  <FormLabel>Senha Mestra</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Sua senha segura"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Autenticando..." : "Acessar Painel"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
