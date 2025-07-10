// app/contato/page.tsx
import { ContactForm } from "@/app/marketing/sections/Contact";
import NavBar from "../marketing/sections/NavBar";

export default function ContatoPage() {
  return (
    <>
      <NavBar />
      <ContactForm />
    </>
  );
}
