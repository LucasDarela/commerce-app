"use client";

import { useSortable } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { IconGripVertical } from "@tabler/icons-react";

type Props = {
  id: string;
};

export function DragHandle({ id }: Props) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="cursor-grab active:cursor-grabbing text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}
