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
            <AccordionTrigger>Building Get Help 🚧</AccordionTrigger>
            <AccordionContent>
            Thanks for your pacience, we are building this section.
            </AccordionContent>
        </AccordionItem>
        </Accordion>

        </div>
    )
}