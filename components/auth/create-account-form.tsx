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
import { CheckCircle2, XCircle, Mail, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
    phone: z
      .string({ required_error: "O telefone é obrigatório." })
      .min(14, "Informe um telefone válido completo com DDD."),
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", phone: "", password: "", confirmPassword: "" },
  });

  // Observa o valor do campo senha em tempo real
  const passwordValue = useWatch({ control: form.control, name: "password" });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      const supabase = createBrowserSupabaseClient();
      const { email, phone, password } = values;

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { phone },
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
        form.reset();
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("CreateAccountForm", err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.push("/login-signin");
  };

  return (
    <>
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    placeholder="(11) 9 9999-9999"
                    {...field}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      let formatted = "";
                      if (v.length > 0) {
                        if (v.length <= 2) formatted = `(${v}`;
                        else if (v.length <= 6) formatted = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                        else if (v.length <= 10) formatted = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
                        else formatted = `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7, 11)}`;
                      }
                      field.onChange(formatted);
                    }}
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

      <Dialog open={showSuccessModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl text-center">
              Confirme seu e-mail
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Falta pouco! Enviamos um link de confirmação para o seu e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4 text-sm text-muted-foreground">
            <p className="text-center">
              Para começar a usar o Chopp Hub, por favor, clique no link que enviamos para sua caixa de entrada.
            </p>
            <ul className="list-disc pl-4 space-y-2 text-left w-full">
              <li>Verifique também a pasta de spam ou lixo eletrônico.</li>
              <li>O link de confirmação pode demorar alguns minutos para chegar.</li>
            </ul>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleCloseModal} className="w-full sm:w-auto gap-2">
              Ir para o Login <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
