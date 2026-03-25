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
import { useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "../ui/password-input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  const supabase = createBrowserSupabaseClient();

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

      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyUserError) {
        toast.error("Erro ao identificar o tipo de usuário.");
        return;
      }

      form.reset();

      if (companyUser?.role === "admin") {
        window.location.href = "/dashboard";
        return;
      }

      if (companyUser?.role === "driver" || companyUser?.role === "normal") {
        window.location.href = "/dashboard/orders";
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("LoginAccountForm:onSubmit", error);
      toast.error("Erro inesperado ao tentar efetuar login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center space-y-2">
      <span className="text-lg p-4">É bom ver você novamente.</span>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col space-y-2"
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

          <Button type="submit" className="my-4 w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Entrando..." : "Login"}
          </Button>
        </form>
      </Form>
    </div>
  );
}