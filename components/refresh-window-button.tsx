"use client";

import * as React from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefreshWindowButtonProps {
  onRefresh?: () => void;
}

export function RefreshWindowButton({ onRefresh }: RefreshWindowButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (onRefresh) {
        await onRefresh(); // chama função passada pelo props
      } else {
        // fallback: recarrega a página
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-7"
      onClick={handleClick}
      disabled={loading}
    >
      <RefreshCcw className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Atualizar página</span>
    </Button>
  );
}
