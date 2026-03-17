// components/emails/invite-user-email.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type InviteUserEmailProps = {
  companyName: string;
  invitedByName?: string;
  inviteUrl: string;
};

export default function InviteUserEmail({
  companyName,
  invitedByName,
  inviteUrl,
}: InviteUserEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Você foi convidado para acessar o {companyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Convite para acessar o sistema</Heading>

          <Text style={text}>
            Você recebeu um convite para entrar na equipe da empresa{" "}
            <strong>{companyName}</strong>.
          </Text>

          {invitedByName ? (
            <Text style={text}>
              Convite enviado por <strong>{invitedByName}</strong>.
            </Text>
          ) : null}

          <Section style={buttonWrapper}>
            <Button href={inviteUrl} style={button}>
              Aceitar convite
            </Button>
          </Section>

          <Text style={muted}>
            Se o botão não funcionar, copie e cole este link no navegador:
          </Text>

          <Text style={linkText}>{inviteUrl}</Text>

          <Hr style={hr} />

          <Text style={footer}>
            Chopp Hub • Gestão inteligente para distribuidores
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

const muted = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#6b7280",
  marginTop: "20px",
};

const linkText = {
  fontSize: "13px",
  color: "#111827",
  wordBreak: "break-all" as const,
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

const hr = {
  borderColor: "#e5e7eb",
  margin: "28px 0",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
};