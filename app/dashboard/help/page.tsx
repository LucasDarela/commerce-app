import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Help() {
  return (
    <div className="px-6 mt-9 rounded-lg shadow-md">
      <div className="grid grid-cols-3 gap-4">
        <h1 className="text-2xl font-bold mb-4">Ajuda</h1>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Em Desenvolvimento 🚧</AccordionTrigger>
          <AccordionContent>
            Agradecemos sua paciência, estamos desenvolvendo esta seção.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
