import { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin - Chopp Hub",
  description: "Painel Administrativo do Chopp Hub",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={cn(inter.className, "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col")}>
      {children}
    </div>
  );
}
