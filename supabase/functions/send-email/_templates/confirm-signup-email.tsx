/** @jsxImportSource npm:react@18.3.1 */
import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";

type ConfirmSignupEmailProps = {
  userName?: string;
  confirmUrl: string;
};

export default function ConfirmSignupEmail({
  userName,
  confirmUrl,
}: ConfirmSignupEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirme seu acesso ao Chopp Hub</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Bem-vindo ao Chopp Hub</Heading>

          <Text style={text}>
            {userName ? `Olá, ${userName}.` : "Olá."}
          </Text>

          <Text style={text}>
            Clique no botão abaixo para confirmar seu acesso.
          </Text>

          <Section style={buttonWrapper}>
            <Button href={confirmUrl} style={button}>
              Confirmar acesso
            </Button>
          </Section>

          <Text style={footer}>
            Se você não solicitou isso, pode ignorar este e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0b0b0b",
  fontFamily: "Arial, sans-serif",
  padding: "32px 16px",
};

const container = {
  backgroundColor: "#111111",
  border: "1px solid #222",
  borderRadius: "16px",
  padding: "32px",
  maxWidth: "520px",
  margin: "0 auto",
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