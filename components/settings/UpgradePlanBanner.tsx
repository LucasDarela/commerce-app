"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUpCircle } from "lucide-react";
import Link from "next/link";

interface UpgradePlanBannerProps {
  title: string;
  description: string;
}

export function UpgradePlanBanner({ title, description }: UpgradePlanBannerProps) {
  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
        <div className="bg-primary/10 p-4 rounded-full">
          <Lock className="w-8 h-8 text-primary opacity-80" />
        </div>
        
        <div className="max-w-[450px] space-y-2">
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          <p className="text-muted-foreground text-sm">
            {description}
          </p>
        </div>

        <Link href="/dashboard/billing">
          <Button className="font-bold gap-2">
            <ArrowUpCircle className="w-4 h-4" />
            Fazer Upgrade para o Pro
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
