// app/set-password/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Regras simples
  const minLen = 8;
  const tooShort = password.length > 0 && password.length < minLen;
  const mismatch = confirm.length > 0 && password !== confirm;

  // Habilita o botão só quando está válido
  const canSubmit = useMemo(() => {
    return (
      !loading &&
      password.length >= minLen &&
      confirm.length >= minLen &&
      !mismatch
    );
  }, [loading, password, confirm, mismatch]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < minLen) {
      return toast.error(
        `Defina uma senha com pelo menos ${minLen} caracteres.`,
      );
    }
    if (password !== confirm) {
      return toast.error("As senhas não coincidem.");
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) return toast.error(error.message);

    toast.success("Senha definida com sucesso!");
    router.replace("/marketing/registration-confirmed");
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={onSubmit}
        className="flex flex-col max-w-sm w-full p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Definir senha</h1>

        <div className="space-y-2">
          <PasswordInput
            name="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            autoComplete="new-password"
            autoFocus
            aria-invalid={tooShort ? "true" : "false"}
          />
          {tooShort && (
            <p className="text-sm text-red-500">
              A senha deve ter pelo menos {minLen} caracteres.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <PasswordInput
            name="confirm-password"
            placeholder="Confirmar nova senha"
            value={confirm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setConfirm(e.target.value)
            }
            autoComplete="new-password"
            aria-invalid={mismatch ? "true" : "false"}
          />
          {mismatch && (
            <p className="text-sm text-red-500">As senhas não coincidem.</p>
          )}
        </div>

        <Button type="submit" disabled={!canSubmit}>
          {loading ? "Salvando..." : "Salvar senha"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Dica: use ao menos {minLen} caracteres. Para mais segurança, combine
          letras, números e símbolos.
        </p>
      </form>
    </div>
  );
}
