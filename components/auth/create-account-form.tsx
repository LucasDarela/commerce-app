"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordInput } from "../ui/password-input";
import { useState } from "react";

const formSchema = z
  .object({
    email: z
      .string({ required_error: "O e-mail é obrigatório." })
      .email("Deve ser um e-mail válido."),
    password: z
      .string({ required_error: "A senha é obrigatória." })
      .min(7, "A senha deve ter pelo menos 7 caracteres.")
      .max(15, "Limite excedido de 15 caracteres."),
    confirmPassword: z.string({
      required_error: "Você deve confirmar sua senha.",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas devem corresponder.",
    path: ["confirmPassword"],
  });

export function CreateAccountForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      const supabase = createClientComponentClient();
      const { email, password } = values;

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const { data, error } = await supabase.auth.signUp({
        email,
        password, // senha já criada aqui (cadastro normal)
        options: {
          // fluxo normal: não usar /set-password
          emailRedirectTo: `${siteUrl}/auth/callback?type=signup&next=/marketing/registration-confirmed`,
        },
      });

      if (error) {
        // mensagens mais amigáveis
        if ((error as any)?.code === "user_already_exists") {
          toast.error("Este e-mail já está em uso.");
        } else {
          console.error("Erro no signUp:", error);
          toast.error("Erro ao criar conta. Tente novamente.");
        }
        return;
      }

      // Caso peculiar do Supabase: usuário pode existir e vir sem erro
      if (data.user && (data.user as any).identities?.length === 0) {
        toast.error("Este e-mail já está em uso.");
        return;
      }

      if (data.session) {
        // confirmação de e-mail desativada → já autenticado
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
    <div className="flex flex-col justify-center items-center space-y-2">
      <span className="text-lg p-4">Que bom ver você por aqui!</span>
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
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
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
