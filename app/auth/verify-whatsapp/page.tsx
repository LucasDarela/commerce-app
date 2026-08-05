"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RESEND_COOLDOWN = 60; // segundos

export default function VerifyWhatsAppPage() {
  const router = useRouter();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [initialSent, setInitialSent] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Envia o OTP automaticamente ao carregar a página
  const sendOtp = useCallback(async () => {
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send-otp", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (data.throttled) {
          toast.info("Código já enviado recentemente. Aguarde para reenviar.");
        } else {
          toast.error(data.error || "Erro ao enviar código");
        }
        return;
      }

      setMaskedPhone(data.maskedPhone);
      startCooldown();
      if (!initialSent) {
        setInitialSent(true);
      } else {
        toast.success("Novo código enviado!");
      }
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }, [initialSent, startCooldown]);

  useEffect(() => {
    sendOtp();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foca o primeiro input ao carregar
  useEffect(() => {
    if (initialSent) {
      inputRefs.current[0]?.focus();
    }
  }, [initialSent]);

  // Lida com digitação nos inputs do OTP
  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Avança automaticamente para o próximo campo
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Se completou todos os 6 dígitos, submete automaticamente
    if (newOtp.every((d) => d !== "")) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      const newOtp = text.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(text);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 6) {
      toast.error("Digite todos os 6 dígitos do código");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Código inválido");
        // Limpa os campos em caso de erro
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setVerified(true);
      // Redireciona após 1.5 segundos mostrando a tela de sucesso
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch {
      toast.error("Erro ao verificar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold">Celular verificado!</h2>
          <p className="text-muted-foreground">
            Redirecionando para o painel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Card principal */}
        <div className="rounded-2xl border bg-card shadow-xl overflow-hidden">
          {/* Header colorido */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-8 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Verifique seu Celular (SMS)</h1>
            <p className="text-emerald-100 text-sm mt-1">
              Etapa obrigatória para ativar sua conta
            </p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {/* Instrução */}
            <div className="flex items-start gap-3 rounded-xl bg-muted/60 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para garantir a segurança da plataforma, enviamos um código via SMS para o seu número.{" "}
                {maskedPhone ? (
                  <span className="font-semibold text-foreground">
                    {maskedPhone}
                  </span>
                ) : (
                  "seu número"
                )}
                . Digite-o abaixo para confirmar seu número.
              </p>
            </div>

            {/* Inputs OTP */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Código de verificação
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInput(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading || sending}
                    className={`h-14 w-12 text-center text-xl font-bold tracking-widest rounded-xl border-2 transition-all
                      ${digit ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-border"}
                      ${loading ? "opacity-50" : ""}
                      focus:border-emerald-500 focus:ring-emerald-500/20`}
                  />
                ))}
              </div>
            </div>

            {/* Botão de verificar */}
            <Button
              onClick={() => handleVerify()}
              disabled={loading || otp.some((d) => !d) || sending}
              className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Confirmar código
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            {/* Reenviar código */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Não recebeu o SMS?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={sendOtp}
                disabled={cooldown > 0 || sending || loading}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Reenviar em {cooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Reenviar código
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Número incorreto?{" "}
          <a
            href="/dashboard/account"
            className="underline hover:text-foreground transition-colors"
          >
            Atualize seu perfil
          </a>{" "}
          e solicite um novo código.
        </p>
      </div>
    </div>
  );
}
