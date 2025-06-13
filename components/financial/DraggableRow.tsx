import { TableRow, TableCell } from "@/components/ui/table";
import { Row } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "./DragHandle";
import { CustomColumnDef } from "./columns";
import { FinancialRecord } from "@/components/types/financial";
import { flexRender } from "@tanstack/react-table";

type DraggableRowProps<T extends { id: string }> = {
  row: Row<T>;
};

export function DraggableRow<T extends { id: string }>({
  row,
}: DraggableRowProps<T>) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => {
        const isDragCell = cell.column.id === "drag";

        return (
          <TableCell
            key={cell.id}
            className={
              (cell.column.columnDef as CustomColumnDef<T>)?.meta?.className
            }
          >
            {isDragCell ? (
              <DragHandle id={row.original.id} />
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
