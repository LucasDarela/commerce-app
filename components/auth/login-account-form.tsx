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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "../ui/password-input";

const formSchema = z.object({
  email: z
    .string({
      required_error: "O e-mail é obrigatório.",
    })
    .email({
      message: "Deve ser um e-mail válido.",
    }),

  password: z
    .string({
      required_error: "A senha é obrigatória.",
    })
    .min(7, {
      message: "A senha deve ter pelo menos 7 caracteres.",
    })
    .max(15, {
      message: "Limite excedido de 12 caracteres.",
    }),
});

export function LoginAccountForm() {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
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
      const supabase = createClientComponentClient();
      const { email, password } = values;

      const {
        error,
        data: { session },
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error?.status === 429) {
        toast.error("Muitas tentativas. Tente novamente em alguns minutos.");
      } else if (error) {
        toast.error("Erro de login: " + error.message);
      } else if (session) {
        toast.success("Login com sucesso!");
        form.reset();
        router.refresh();
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("LoginAccountForm:onSubmit", error);
      toast.error("Erro inesperado ao tentar efetuar login.");
    } finally {
      setIsLoading(false);
    }
  };

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleResetPassword = async () => {
    const supabase = createClientComponentClient();

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${location.origin}/auth/reset-password`,
    });

    if (error) {
      toast.error("Erro ao enviar e-mail de recuperação.");
    } else {
      toast.success("Verifique seu e-mail para redefinir sua senha.");
      setShowReset(false);
      setResetEmail("");
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
                  <Input placeholder="E-mail" {...field} />
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
                  <PasswordInput placeholder="Senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className="my-4" type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Login in..." : "Login"}
          </Button>
        </form>
      </Form>
      {/* Forgot Password Block (fora do form) */}
      <div className="text-sm text-center w-full">
        <button
          type="button"
          onClick={() => setShowReset(!showReset)}
          className="text-blue-600 hover:underline"
        >
          Esqueceu a Senha?
        </button>
      </div>

      {showReset && (
        <div className="flex flex-col gap-4 w-auto p-6">
          <Input
            type="email"
            placeholder="Digite seu e-mail"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
          <Button
            type="button"
            onClick={handleResetPassword}
            className="w-full"
          >
            Redefinir senha
          </Button>
        </div>
      )}
    </div>
  );
}
