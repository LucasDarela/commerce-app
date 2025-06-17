import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function () {
  return (
    <div className="my-16 mx-auto">
      <div className="section-heading section-header">
        <h2 className="section-title mt-5">Perguntas Frequentes</h2>
        <p className="section-description mt-5">
          Suas dúvidas podem ser esclarecidas a baixo
        </p>
      </div>
      <div className="flex justify-center gap-6 mt-10 ">
        <Accordion type="single" collapsible className="w-[500px]">
          <AccordionItem value="usabilidade">
            <AccordionTrigger>
              Posso usar o sistema tanto no celular quanto no computador?
            </AccordionTrigger>
            <AccordionContent>
              Sim! O Chopp Hub é 100% responsivo e pode ser utilizado em
              qualquer dispositivo — seja celular, tablet ou desktop — com a
              mesma fluidez e usabilidade.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="financeiro">
            <AccordionTrigger>
              O sistema possui controle financeiro?
            </AccordionTrigger>
            <AccordionContent>
              Sim. O Chopp Hub oferece um painel financeiro completo com
              controle de contas a pagar e a receber, histórico de pagamentos,
              emissão de boletos e relatórios mensais.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cadastro">
            <AccordionTrigger>
              Consigo cadastrar clientes, fornecedores, produtos e equipamentos?
            </AccordionTrigger>
            <AccordionContent>
              Com certeza! O sistema permite o cadastro e a gestão completa de
              clientes, fornecedores, produtos e equipamentos, tudo integrado ao
              estoque e vendas.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="vendas">
            <AccordionTrigger>
              É possível controlar as vendas pelo sistema?
            </AccordionTrigger>
            <AccordionContent>
              Sim. Você pode registrar vendas, acompanhar pagamentos, agendar
              entregas e gerar relatórios detalhados diretamente pelo painel de
              vendas.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="estoque">
            <AccordionTrigger>
              O sistema faz controle de estoque?
            </AccordionTrigger>
            <AccordionContent>
              Sim! O estoque é atualizado automaticamente com base nas vendas,
              entradas e devoluções. Você também pode visualizar o saldo de
              barris e equipamentos em tempo real.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="boletos">
            <AccordionTrigger>
              Consigo gerar boletos para os clientes?
            </AccordionTrigger>
            <AccordionContent>
              Sim. O Chopp Hub permite a geração de boletos via integração com
              serviços como Mercado Pago ou Asaas, com vencimento personalizado,
              juros e multa automáticos.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="nota-fiscal">
            <AccordionTrigger>
              O sistema emite nota fiscal eletrônica?
            </AccordionTrigger>
            <AccordionContent>
              Sim! O sistema possui integração com a Focus NFe, permitindo
              emissão de notas fiscais eletrônicas (NF-e) com apenas alguns
              cliques.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="facilidade">
            <AccordionTrigger>O sistema é fácil de usar?</AccordionTrigger>
            <AccordionContent>
              Sim! O Chopp Hub foi pensado para ser intuitivo, com interface
              limpa, navegação rápida e suporte em português. Mesmo usuários sem
              experiência técnica conseguem utilizá-lo facilmente.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
