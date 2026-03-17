"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PageUnderDevelopmentGateProps = {
  open?: boolean;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export default function PageUnderDevelopmentGate({
  open = true,
  title = "Em desenvolvimento",
  description = "Esta página está em desenvolvimento, em breve você terá novidades...",
  backHref = "/dashboard",
  backLabel = "Voltar para o dashboard",
}: PageUnderDevelopmentGateProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}