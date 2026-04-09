import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  return (
    <div className="my-16 mx-auto px-4 sm:px-6" id="faq">
      <div className="section-heading section-header">
        <h2 className="section-title mt-5 text-primary">
          Perguntas Frequentes
        </h2>
        <p className="section-description mt-5 text-muted-foreground">
          Tire suas dúvidas e veja como o Chopp Hub pode facilitar sua operação
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <Accordion type="single" collapsible className="w-full max-w-2xl">

          <AccordionItem value="planilha">
            <AccordionTrigger>
              Qual a diferença entre usar o Chopp Hub e uma planilha?
            </AccordionTrigger>
            <AccordionContent>
              Planilhas dependem de controle manual e são fáceis de errar. O Chopp Hub automatiza processos como estoque, entregas, financeiro e cobranças, reduzindo erros e evitando prejuízos que muitas vezes passam despercebidos.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="nota-fiscal">
            <AccordionTrigger>
              Sou obrigado a emitir nota fiscal em todas as vendas?
            </AccordionTrigger>
            <AccordionContent>
              Não. Você tem total liberdade. Pode emitir nota fiscal apenas quando quiser, sem travar sua operação. O sistema funciona normalmente mesmo sem emissão de NF-e.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="boletos">
            <AccordionTrigger>
              Consigo gerar e controlar boletos pelo sistema?
            </AccordionTrigger>
            <AccordionContent>
              Sim. Você pode gerar boletos, acompanhar pagamentos e saber exatamente quem pagou e quem está em aberto, trazendo mais controle e organização para sua cobrança.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="financeiro">
            <AccordionTrigger>
              O sistema ajuda no controle financeiro da empresa?
            </AccordionTrigger>
            <AccordionContent>
              Sim. Você acompanha contas a pagar, contas a receber e valores pendentes em um único lugar, sem depender de anotações soltas ou controles paralelos.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="motorista">
            <AccordionTrigger>
              O motorista pode usar o sistema durante as entregas?
            </AccordionTrigger>
            <AccordionContent>
              Sim. O motorista pode acessar o sistema pelo celular e dar baixa nas entregas e coletas em tempo real, evitando erros, retrabalho e falta de comunicação com a equipe.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="entregas">
            <AccordionTrigger>
              Consigo saber o que precisa ser entregue ou coletado no dia?
            </AccordionTrigger>
            <AccordionContent>
              Sim. O sistema mostra exatamente o que precisa ser entregue, coletado e o que já foi finalizado, ajudando você a não esquecer pedidos e manter a operação organizada.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="acesso">
            <AccordionTrigger>
              Posso limitar o acesso dos funcionários no sistema?
            </AccordionTrigger>
            <AccordionContent>
              Sim. Cada usuário acessa apenas o que precisa. O motorista, por exemplo, não vê o financeiro nem dados sensíveis da empresa, garantindo mais segurança.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="relatorios">
            <AccordionTrigger>
              O sistema possui relatórios para acompanhar o negócio?
            </AccordionTrigger>
            <AccordionContent>
              Sim. Você terá relatórios de vendas, estoque, comodatos, equipamentos e produtos, permitindo identificar problemas e tomar decisões com mais segurança.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="equipe">
            <AccordionTrigger>
              Minha equipe vai conseguir usar o sistema?
            </AccordionTrigger>
            <AccordionContent>
              Sim. O sistema foi desenvolvido para ser simples e direto. Mesmo quem nunca utilizou um sistema consegue aprender rapidamente no dia a dia.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mudanca">
            <AccordionTrigger>
              É difícil sair do controle atual e começar a usar o sistema?
            </AccordionTrigger>
            <AccordionContent>
              Não. A transição é simples e você pode começar aos poucos. Em pouco tempo já percebe mais organização, menos erros e mais controle da operação.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="resultado">
            <AccordionTrigger>
              O sistema realmente ajuda a evitar prejuízos?
            </AccordionTrigger>
            <AccordionContent>
              Sim. Muitos prejuízos vêm de erros de controle, falta de organização e falhas na comunicação. O Chopp Hub resolve esses pontos e ajuda você a ter mais clareza e controle do negócio.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="usabilidade">
            <AccordionTrigger>
              Posso usar o sistema no celular e no computador?
            </AccordionTrigger>
            <AccordionContent>
              Sim. O Chopp Hub é totalmente responsivo e funciona perfeitamente em celular, tablet e computador.
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}