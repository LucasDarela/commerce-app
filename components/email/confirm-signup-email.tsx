// components/emails/confirm-signup-email.tsx
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
} from "@react-email/components";

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
      <Preview>Confirme seu cadastro no Chopp Hub</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Bem-vindo ao Chopp Hub</Heading>

          <Text style={text}>
            {userName ? `Olá, ${userName}.` : "Olá."}
          </Text>

          <Text style={text}>
            Seu cadastro foi criado com sucesso. Clique no botão abaixo para
            confirmar seu acesso.
          </Text>

          <Section style={buttonWrapper}>
            <Button href={confirmUrl} style={button}>
              Confirmar cadastro
            </Button>
          </Section>

          <Text style={text}>
            Se você não reconhece esta ação, ignore este e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "Arial, sans-serif",
  padding: "30px 0",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
  maxWidth: "520px",
  margin: "0 auto",
};

const heading = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#111827",
  marginBottom: "16px",
};

const text = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#374151",
};

const buttonWrapper = {
  textAlign: "center" as const,
  margin: "28px 0",
};

const button = {
  backgroundColor: "#111111",
  color: "#ffffff",
  padding: "14px 24px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: "600",
};