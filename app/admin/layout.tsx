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
    <div className={cn(inter.className, "dark bg-black text-neutral-50 min-h-screen flex flex-col")}>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
