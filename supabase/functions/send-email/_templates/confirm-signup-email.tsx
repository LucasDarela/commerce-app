/** @jsxImportSource npm:react@18.3.1 */
import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";

interface ConfirmSignupEmailProps {
  confirmUrl: string;
  userName?: string;
}

export default function ConfirmSignupEmail({
  confirmUrl,
  userName,
}: ConfirmSignupEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirme seu acesso ao Chopp Hub e otimize suas entregas</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Bem-vindo(a) ao Chopp Hub! 🍻</Heading>

          <Text style={text}>
            {userName ? `Olá, ${userName}!` : "Olá!"}
          </Text>

          <Text style={text}>
            Ficamos muito felizes em ter você conosco. O <strong>Chopp Hub</strong> é a plataforma definitiva para a gestão eficiente do seu negócio de chopp e bebidas.
          </Text>

          <Text style={text}>
            Para ativar sua conta, garantir a segurança dos seus dados e ter acesso a todas as nossas ferramentas de logística e operação, por favor, confirme seu e-mail clicando no botão abaixo:
          </Text>

          <Section style={buttonContainer}>
            <Button href={confirmUrl} style={button}>
              Confirmar meu Cadastro e Acessar
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Se o botão não funcionar, você pode copiar e colar este link no seu navegador:
            <br />
            <Link href={confirmUrl} style={link}>
              {confirmUrl}
            </Link>
          </Text>

          <Text style={footer}>
            Se você não solicitou isso, pode ignorar e excluir este e-mail em segurança.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f9fafb",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: "40px 0",
};

const container = {
  margin: "0 auto",
  padding: "40px 30px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
  border: "1px solid #f3f4f6",
  maxWidth: "580px",
};

const heading = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  marginBottom: "16px",
};

const text = {
  color: "#d1d5db",
  fontSize: "15px",
  lineHeight: "24px",
};

const buttonWrapper = {
  textAlign: "center" as const,
  margin: "28px 0",
};

const button = {
  backgroundColor: "#16a34a",
  color: "#ffffff",
  padding: "14px 24px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: "700",
};

const footer = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "20px",
};