import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import logo from "@/app/assets/logo-blue.png";

export const metadata: Metadata = {
  title: "Termos e Condições | Chopp Hub",
  description:
    "Leia os Termos e Condições de uso da plataforma Chopp Hub, operada pela Loading Tecnology.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-[#BCBCBC]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logo}
              alt="Logo Chopp Hub"
              className="h-9 w-9 object-contain"
            />
            <span className="text-xl font-bold text-white">Chopp Hub</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-[#BCBCBC] hover:text-white transition-colors"
          >
            ← Voltar ao site
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-extrabold text-white mb-8">
          Termos e Condições
        </h1>

        <p className="mb-4 leading-relaxed">
          Estes termos e condições aplicam-se ao aplicativo ChoppHub Driver para
          dispositivos móveis e navegadores da web, juntamente com quaisquer
          serviços relacionados operados pela Loading Tecnology (coletivamente, o
          &quot;Aplicativo&quot;). A Loading Tecnology é aqui referida como a
          &quot;Provedora de Serviços&quot;.
        </p>
        <p className="mb-4 leading-relaxed">
          Ao baixar ou usar o Aplicativo, você concorda com estes Termos e
          Condições. Você deve lê-los cuidadosamente antes de usar o Aplicativo.
        </p>

        <Section title="Licença de uso do Aplicativo">
          Sujeito à sua conformidade com estes Termos, a Provedora de Serviços
          concede a você uma licença limitada, não exclusiva, intransferível e
          revogável para instalar e usar o Aplicativo em um dispositivo móvel ou
          computador para fins pessoais ou comerciais internos. Você não pode
          reproduzir, distribuir, modificar, criar trabalhos derivados, fazer
          engenharia reversa, descompilar ou desmontar o Aplicativo, exceto e
          apenas na medida em que tal atividade seja expressamente permitida pela
          lei aplicável.
        </Section>

        <Section title="Propriedade Intelectual">
          A Provedora de Serviços retém todos os direitos de propriedade
          intelectual do Aplicativo, incluindo seu código, design, marcas
          registradas, marcas de serviço, nomes comerciais, logotipos e identidade
          visual (a &quot;PI&quot;). Nada nestes Termos concede a você qualquer
          licença ou direito de usar as marcas registradas, logotipos ou identidade
          visual da Provedora de Serviços para qualquer finalidade. Você concorda
          em não remover, alterar ou ocultar nenhum aviso de direitos autorais,
          marca registrada ou outros avisos de propriedade exibidos no ou sobre o
          Aplicativo.
        </Section>

        <Section title="Rescisão">
          <p className="mb-4">
            A Provedora de Serviços pode suspender seu acesso ao Aplicativo ou
            aos serviços se você violar materialmente estes Termos. A Provedora de
            Serviços fornecerá a você um aviso por escrito da violação e, nos casos
            em que a violação puder ser sanada, você terá 14 dias a partir do
            recebimento do aviso para remediar a violação. Se você não conseguir
            sanar a violação dentro desse período, a Provedora de Serviços poderá
            encerrar seu acesso.
          </p>
          <p className="mb-4">
            A Provedora de Serviços pode suspender ou encerrar seu acesso
            imediatamente, sem aviso prévio, se você violar a lei aplicável,
            infringir direitos de propriedade intelectual ou envolver-se em
            atividades que possam causar danos a outros usuários ou à Provedora de
            Serviços.
          </p>
          <p className="mb-4">
            Em caso de rescisão, seu direito de usar o Aplicativo será encerrado e
            você deverá excluir todas as cópias dos seus dispositivos.
          </p>
          <p className="mb-4">
            Ao acessar e usar este Aplicativo, você declara estar legalmente
            autorizado a usá-lo em sua jurisdição. Você deve ter pelo menos 18 anos
            de idade para usar o Aplicativo.
          </p>
          <p className="mb-4">
            A cópia ou modificação não autorizada do Aplicativo, de qualquer parte
            do Aplicativo, ou das marcas registradas da Provedora de Serviços é
            estritamente proibida.
          </p>
        </Section>

        <Section title="Conteúdo Gerado pelo Usuário e Uso Aceitável">
          <p className="mb-3">
            Se este Aplicativo permitir que os usuários postem, compartilhem ou
            façam upload de conteúdo, você concorda em não postar conteúdo que:
          </p>
          <BulletList
            items={[
              "Seja ilegal ou viole direitos de propriedade intelectual de terceiros",
              "Seja abusivo, ameaçador, assediador, difamatório ou discurso de ódio",
              "Contenha discriminação ou incitação à violência ou a atividades ilegais",
              "Seja spam, phishing ou contenha malware",
              "Viole os direitos de privacidade ou dados pessoais de terceiros",
              "Seja enganoso, falso ou fraudulento",
              "Contenha violência explícita ou conteúdo sexual impróprio",
            ]}
          />
          <p className="mb-3">A Provedora de Serviços reserva-se o direito de:</p>
          <BulletList
            items={[
              "Remover ou desativar o acesso a conteúdo que viole estas diretrizes",
              "Suspender ou encerrar contas de usuários que violarem repetidamente estas diretrizes",
              "Cooperar com as autoridades policiais se conteúdo ilegal for denunciado",
              "Moderar, filtrar ou ocultar conteúdo que viole estes Termos",
            ]}
          />
          <p className="mb-4">
            Se você acredita que algum conteúdo viola estes Termos, pode denunciá-lo
            em{" "}
            <a
              href="mailto:suporte@chopphub.com"
              className="text-blue-400 hover:underline"
            >
              suporte@chopphub.com
            </a>
            .
          </p>
          <p className="mb-4">
            Ao enviar Conteúdo Gerado pelo Usuário, você concede à Provedora de
            Serviços uma licença não exclusiva, mundial e isenta de royalties para
            usar, reproduzir e distribuir o conteúdo em conexão com o Aplicativo.
          </p>
        </Section>

        <Section title="Serviços de Terceiros">
          <BulletList items={["Google Play Services"]} />
          <p className="mb-4">
            Esteja ciente de que a Provedora de Serviços não assume
            responsabilidade por certas situações. Algumas funções do Aplicativo
            exigem uma conexão ativa com a internet. A Provedora de Serviços não
            pode ser responsabilizada se o Aplicativo não funcionar com capacidade
            total devido à falta de acesso à internet ou dados esgotados.
          </p>
          <p className="mb-4">
            Nada nestes Termos limitará quaisquer direitos que você tenha de acordo
            com as leis de proteção ao consumidor aplicáveis.
          </p>
        </Section>

        <Section title="Limitação de Responsabilidade">
          <p className="mb-4">
            Na extensão máxima permitida por lei, a Provedora de Serviços não será
            responsável por quaisquer danos indiretos, incidentais, especiais,
            consequenciais ou punitivos, incluindo perda de lucros, perda de dados
            ou interrupção de negócios.
          </p>
          <p className="mb-3">
            No entanto, a Provedora de Serviços retém total responsabilidade por:
          </p>
          <BulletList
            items={[
              "Morte ou danos pessoais causados por negligência",
              "Fraude ou declaração fraudulenta",
              "Qualquer outra responsabilidade que não possa ser excluída sob a lei aplicável",
            ]}
          />
        </Section>

        <Section title="Indenização">
          <p className="mb-4">
            Na extensão máxima permitida por lei, você concorda em indenizar e
            isentar a Provedora de Serviços de e contra quaisquer reclamações,
            responsabilidades, danos, perdas e despesas decorrentes de sua violação
            destes Termos ou do uso indevido do Aplicativo.
          </p>
        </Section>

        <Section title="Lei Aplicável e Jurisdição">
          <p className="mb-4">
            Estes Termos e Condições são regidos pelas leis da jurisdição em que a
            Provedora de Serviços está estabelecida. Qualquer disputa decorrente
            destes Termos será apresentada aos tribunais que possuam jurisdição
            sob a lei aplicável.
          </p>
        </Section>

        <Section title="Conformidade com a DSA (Lei de Serviços Digitais)">
          <p className="mb-4">
            <strong className="text-white">Ponto de Contato:</strong> A Provedora
            de Serviços mantém um ponto de contato único acessível por{" "}
            <a
              href="mailto:suporte@chopphub.com"
              className="text-blue-400 hover:underline"
            >
              suporte@chopphub.com
            </a>
            .
          </p>
          <p className="mb-4">
            <strong className="text-white">Moderação de Conteúdo:</strong> Quando a
            Provedora de Serviços restringir o acesso a conteúdo ou suspender uma
            conta, uma declaração de motivos clara será fornecida ao usuário
            afetado.
          </p>
          <p className="mb-4">
            <strong className="text-white">
              Resolução Extrajudicial de Disputas:
            </strong>{" "}
            Disputas referentes a decisões de moderação podem ser enviadas a um
            órgão de resolução extrajudicial certificado de acordo com o Artigo 21
            da DSA.
          </p>
        </Section>

        <Section title="Alterações nestes Termos e Condições">
          <p className="mb-4">
            A Provedora de Serviços poderá atualizar periodicamente os seus Termos
            e Condições. Versões anteriores serão mantidas e disponibilizadas
            mediante solicitação pelo e-mail{" "}
            <a
              href="mailto:suporte@chopphub.com"
              className="text-blue-400 hover:underline"
            >
              suporte@chopphub.com
            </a>
            .
          </p>
          <p className="mb-4 font-semibold text-white">
            Estes termos e condições entram em vigor a partir de 24 de julho de
            2026.
          </p>
        </Section>

        <Section title="Entre em Contato Conosco">
          <p className="mb-4">
            Se você tiver alguma dúvida ou sugestão sobre os Termos e Condições,
            não hesite em contatar a Provedora de Serviços em{" "}
            <a
              href="mailto:suporte@chopphub.com"
              className="text-blue-400 hover:underline"
            >
              suporte@chopphub.com
            </a>
            .
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 py-8 text-center text-sm text-[#BCBCBC]">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="font-bold text-white">Chopp Hub</span>. Todos os
          direitos reservados.
        </p>
      </footer>
    </div>
  );
}

/* ── Helper components ──────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      <div className="leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-none ml-4 mb-4 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-blue-400 mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
