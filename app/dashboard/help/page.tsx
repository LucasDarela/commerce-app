import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
  

export default function Help() {
    return (
        <div className="m-10 p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-3 gap-4">
          <h1 className="text-2xl font-bold mb-4">Get Help</h1>
        </div>

        <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
        </AccordionItem>
        </Accordion>

        <Accordion type="single" collapsible>
        <AccordionItem value="item-2">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
        </AccordionItem>
        </Accordion>

        <Accordion type="single" collapsible>
        <AccordionItem value="item-3">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
        </AccordionItem>
        </Accordion>

        <Accordion type="single" collapsible>
        <AccordionItem value="item-4">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
        </AccordionItem>
        </Accordion>

        </div>
    )
}