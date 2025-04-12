"use client"

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";
import { toast } from "sonner";


const formSchema = z.object ({
    email: z.string({
        required_error: "Email is required."
    }).email({
        message: "Must be a valid email."
    }),

    password: z.string({
        required_error: "Password is required."
    }).min(7, { 
                message: "Password must have at least 7 characters."
    }).max(12, {
        message: "Exceded limit of 12 characters."
    }),
});

export function LoginAccountForm() {

    const [isLoading, setIsLoading] = useState(false)

    const router = useRouter();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof 
    formSchema>) => {

        setIsLoading(true)

        try{
            const supabase = createClientComponentClient();
            const {email, password} = values;
            const {error, data: { session },
        } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if(error){
                console.log("Login error:", error.message);
                return;
            }

            form.reset();
            router.refresh();
            router.push("/dashboard");
        }catch(error){
            console.log("LoginAccountForm:onSubmit", error);
        }
        finally{
            setIsLoading(false)
        }
    };

    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState("");

    const handleResetPassword = async () => {
    const supabase = createClientComponentClient();

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${location.origin}/auth/reset-password`, // página que o usuário será redirecionado
    });

    if (error) {
        toast.error("Erro ao enviar e-mail de recuperação.");
    } else {
        toast.success("Verifique seu e-mail para redefinir a senha.");
        setShowReset(false);
        setResetEmail("");
    }
    };

    return (
    <div className="flex flex-col justify-center items-center space-y-2">
            <span className="text-lg p-4">It's good to see you again.</span>
            <Form {...form}>
                <form 
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col space-y-2"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>E-mail</FormLabel>
                                    <FormControl>
                                        <Input 
                                        placeholder="E-mail" 
                                        {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}

                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password"
                                        placeholder="Password" 
                                        {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                            <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? "Entrando..." : "Entrar"}
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
          Forgot Password?
        </button>
      </div>

      {showReset && (
        <div className="flex flex-col gap-4 w-auto p-6">
          <Input
            type="email"
            placeholder="Type your e-mail"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
          <Button type="button" onClick={handleResetPassword} className="w-full">
            Reset Password
          </Button>
        </div>
      )}
    </div>
  );
}

