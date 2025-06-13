import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "@radix-ui/react-icons";

type DatePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
};

export function DatePicker({ date, setDate }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild={true}>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Selecionar data"
          aria-expanded="true"
          className="min-w-[150px] justify-start text-left font-normal"
        >
          {date ? format(date, "dd/MM/yyyy") : <span>Escolher data</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
