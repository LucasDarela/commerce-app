import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers"; 
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateAccountForm } from "@/components/auth/create-account-form";
import { LoginAccountForm } from "@/components/auth/login-account-form"

export default async function LogInSignIn() {

  return (
   <div className="flex flex-col h-screen w-full justify-center items-center">

         {/* Account Tabs and Password */}
        <Tabs defaultValue="login" className="w-[400px] border rounded-lg pb-4 shadow-2xl">
      <TabsList className="flex justify-around items-center w-full rounded-b-none h-14">
        <TabsTrigger value="login" className="transition-all delay-150">Login</TabsTrigger>
        <TabsTrigger value="create-account" className="transition-all delay-150">Create Account</TabsTrigger>

      </TabsList>
      {/* Login */}
      <TabsContent value="login">
        <LoginAccountForm />
      </TabsContent>
      {/* Create account */}
      <TabsContent value="create-account">
        <CreateAccountForm />
      </TabsContent>

    </Tabs>
   </div>
  );
}
