"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordInput } from "../ui/password-input";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

// ─── Regras de senha ──────────────────────────────────────────────────────────
const passwordRules = [
  {
    id: "minLength",
    label: "Mínimo de 8 caracteres",
    test: (v: string) => v.length >= 8,
  },
  {
    id: "hasUppercase",
    label: "Pelo menos uma letra maiúscula",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    id: "hasNumber",
    label: "Pelo menos um número",
    test: (v: string) => /[0-9]/.test(v),
  },
];

const formSchema = z
  .object({
    email: z
      .string({ required_error: "O e-mail é obrigatório." })
      .email("Deve ser um e-mail válido."),
    password: z
      .string({ required_error: "A senha é obrigatória." })
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(15, "Limite excedido de 15 caracteres.")
      .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
    confirmPassword: z.string({
      required_error: "Você deve confirmar sua senha.",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas devem corresponder.",
    path: ["confirmPassword"],
  });

// ─── Componente de checklist ──────────────────────────────────────────────────
function PasswordChecklist({ value }: { value: string }) {
  if (!value) return null;

  return (
    <ul className="mt-2 space-y-1">
      {passwordRules.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              ok ? "text-green-600 dark:text-green-400" : "text-destructive"
            }`}
          >
            {ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Formulário ───────────────────────────────────────────────────────────────
export function CreateAccountForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  // Observa o valor do campo senha em tempo real
  const passwordValue = useWatch({ control: form.control, name: "password" });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      const supabase = createBrowserSupabaseClient();
      const { email, password } = values;

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?type=signup&next=/marketing/registration-confirmed`,
        },
      });

      if (error) {
        if ((error as any)?.code === "user_already_exists") {
          toast.error("Este e-mail já está em uso.");
        } else {
          console.error("Erro no signUp:", error);
          toast.error("Erro ao criar conta. Tente novamente.");
        }
        return;
      }

      if (data.user && (data.user as any).identities?.length === 0) {
        toast.error("Este e-mail já está em uso.");
        return;
      }

      if (data.session) {
        toast.success("Conta criada com sucesso!");
        router.replace("/marketing/registration-confirmed");
        return;
      }

      if (data.user) {
        toast.success("Verifique seu e-mail para confirmar sua inscrição.");
        form.reset();
        router.push("/login-signin");
      }
    } catch (err) {
      console.error("CreateAccountForm", err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center space-y-2 px-6">
      <span className="text-base pt-3 pb-1 text-muted-foreground">
        Crie sua conta para iniciar o teste grátis.
      </span>
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
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                {/* Checklist visual em tempo real */}
                <PasswordChecklist value={passwordValue ?? ""} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirme a Senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Confirme a Senha"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="my-4 w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar Conta"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
