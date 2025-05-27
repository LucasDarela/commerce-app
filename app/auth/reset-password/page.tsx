"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  const { user, companyId, loading } = useAuthenticatedCompany();

  // ✅ Aguarda o evento de recuperação de senha
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          console.log("Sessão restaurada ✅", session);
          setSessionRestored(true);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  // ✅ Se o usuário já estiver autenticado após reload
  useEffect(() => {
    if (!loading && user) {
      setSessionRestored(true);
    }
  }, [loading, user]);

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
          id="reset-password"
          name="reset-password"
          type="password"
          placeholder="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          id="reset-confirm-password"
          name="reset-confirm-password"
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