"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import { useRef, useState } from "react";

const contactSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  message: z.string().min(10, "Mensagem muito curta"),
});

export function ContactForm() {
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof contactSchema>) => {
    try {
      setIsVerifying(true); // desabilita o botão temporariamente

      const token = await recaptchaRef.current?.executeAsync();
      recaptchaRef.current?.reset();

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, recaptchaToken: token }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Erro ao enviar");
        return;
      }

      toast.success("Mensagem enviada com sucesso!");
      form.reset();
    } catch (err) {
      toast.error("Erro inesperado ao enviar");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section id="contact" className="max-w-2xl mx-auto mt-20 px-4 py-12">
      <div>
        <h2 className="section-title mb-4 text-center text-primary">
          Fale com a gente
        </h2>
        <p className="text-xs text-center text-muted-foreground my-4">
          Este site é protegido pelo reCAPTCHA e está sujeito à
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            className="underline ml-1"
          >
            Política de Privacidade
          </a>{" "}
          e aos
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            className="underline ml-1"
          >
            Termos de Serviço
          </a>{" "}
          do Google.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="voce@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Escreva sua mensagem aqui..."
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
            ref={recaptchaRef}
            size="invisible"
          />
          <Button type="submit" className="w-full" disabled={isVerifying}>
            {isVerifying ? "Validando..." : "Enviar mensagem"}
          </Button>
        </form>
      </Form>
    </section>
  );
}
