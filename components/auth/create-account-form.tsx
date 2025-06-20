"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordInput } from "../ui/password-input";

const formSchema = z
  .object({
    email: z
      .string({ required_error: "O e-mail é obrigatório." })
      .email({ message: "Deve ser um e-mail válido." }),

    password: z
      .string({ required_error: "A senha é obrigatória." })
      .min(7, { message: "A senha deve ter pelo menos 7 caracteres." })
      .max(15, { message: "Limite excedido de 15 caracteres." }),

    confirmPassword: z.string({
      required_error: "Você deve confirmar sua senha.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas devem corresponder.",
    path: ["confirmPassword"],
  });

export function CreateAccountForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const supabase = createClientComponentClient();
      const { email, password } = values;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Erro no signUp:", error.message);
        toast.error("Erro ao criar conta. Tente novamente.");
        return;
      }

      if (data.user) {
        toast.success("Verifique seu e-mail para confirmar sua inscrição.");
        form.reset();
        router.push("/login-signin");
      }
    } catch (error) {
      console.error("CreateAccountForm", error);
      toast.error("Erro inesperado. Tente novamente.");
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
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirme a Senha</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="Confirme a Senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="my-4 w-full">
            Criar Conta
          </Button>
        </form>
      </Form>
    </div>
  );
}
