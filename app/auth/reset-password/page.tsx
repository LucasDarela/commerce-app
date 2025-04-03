"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // ✅ Aqui a mágica: aguardar evento de recuperação de senha
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          console.log("Sessão restaurada ✅", session);
          setSessionRestored(true);
        }
      }
    );

    // Verifica se a sessão já existe (caso a página seja recarregada após o login)
    const { user, loading } = useAuthenticatedCompany().then(({ data }) => {
      if (data.session) {
        setSessionRestored(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (!sessionRestored) {
      toast.error("Sessão não autenticada. Clique novamente no link do e-mail.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error("Erro ao redefinir a senha.");
    } else {
      toast.success("Senha redefinida com sucesso.");
      router.push("/login-signin");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Redefinir Senha</h1>
      <div className="space-y-4">
        <Input
          type="password"
          placeholder="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Confirmar nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={handleResetPassword}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Redefinindo..." : "Redefinir Senha"}
        </Button>
      </div>
    </div>
  );
}