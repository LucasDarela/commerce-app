"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import SignatureCanvas from "react-signature-canvas";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { PDFDownloadLink, Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { getTrimmedCanvas } from "@/lib/getTrimmedCanvasManually";

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 12, fontFamily: "Helvetica" },
    logo: { width: 120, height: 40, marginBottom: 20 },
    title: { fontSize: 20, marginBottom: 16, textAlign: "center" },
    section: { marginBottom: 10 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    label: { fontWeight: "bold", marginBottom: 2 },
    value: { marginBottom: 6 },
    barcodeBox: {
      marginTop: 10,
      padding: 10,
      border: "1px solid #000",
      textAlign: "center",
    },
    signatureBox: {
      marginTop: 20,
      borderTop: "1px solid #000",
      paddingTop: 10,
      alignItems: "center",
    },
    signature: { width: 200, height: 100 },
  });
  
  const BoletoPDF = ({
    order,
    signatureData,
    vencimentoStr,
  }: {
    order: any;
    signatureData: string;
    vencimentoStr: string;
  }) => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logomarca da empresa */}
        {order.company_logo ? (
            <Image src={order.company_logo} style={styles.logo} />
            ) : (
            <Text style={{ marginBottom: 20 }}>Darela Chopp</Text>
            )}
  
        {/* Título */}
        <Text style={styles.title}>Boleto - Pedido #{order.note_number}</Text>
  
        {/* Dados do cliente e pagamento */}
        <View style={styles.section}>
          <Text style={styles.label}>Cliente:</Text>
          <Text style={styles.value}>{order.customer}</Text>
  
          <Text style={styles.label}>Valor total:</Text>
          <Text style={styles.value}>R$ {order.total?.toFixed(2)}</Text>
  
          <Text style={styles.label}>Vencimento:</Text>
          <Text style={styles.value}>{vencimentoStr}</Text>
        </View>
  
        {/* Linha digitável */}
        {order.boleto_digitable_line && (
          <View style={styles.section}>
            <Text style={styles.label}>Linha Digitável:</Text>
            <Text style={styles.value}>{order.boleto_digitable_line}</Text>
          </View>
        )}
  
        {/* Código de barras */}
        {order.boleto_barcode_number && (
          <View style={styles.barcodeBox}>
            <Text style={styles.label}>Código de Barras:</Text>
            <Text>{order.boleto_barcode_number}</Text>
          </View>
        )}
  
        {/* Assinatura */}
        <View style={styles.signatureBox}>
          <Text style={styles.label}>Assinatura do Cliente</Text>
          {signatureData && <Image src={signatureData} style={styles.signature} />}
        </View>
      </Page>
    </Document>
  );

export default function OrderBoletoPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;
  const [order, setOrder] = useState<any>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [sigPad, setSigPad] = useState<SignatureCanvas | null>(null);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id as string)
      .single();
  
    if (error) {
      toast.error("Erro ao carregar pedido.");
    } else {
      setOrder(data);
      if (data.customer_signature) {
        setSignatureData(data.customer_signature);
      }
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleSaveSignature = async () => {
    if (!sigPad || sigPad.isEmpty()) {
      toast.error("Assinatura obrigatória.");
      return;
    }
  
    await fetchOrder();
  
    const canvas = sigPad?.getCanvas();
    const trimmed = canvas ? getTrimmedCanvas(canvas) : null;
    const dataUrl = trimmed?.toDataURL("image/png");

    if (dataUrl) {
      console.log("🖊️ Assinatura gerada (base64):", dataUrl.slice(0, 100));
      setSignatureData(dataUrl);
    } else {
      console.error("⚠️ Erro: dataUrl indefinido ao salvar assinatura.");
    }
  
    setSignatureData(dataUrl ?? null);
  
    // Atualiza no Supabase
    const { error } = await supabase
      .from("orders")
      .update({ customer_signature: dataUrl })
      .eq("id", id);
  
    if (error) {
      toast.error("Erro ao salvar assinatura no banco.");
      console.error("❌ Supabase error:", error);
    } else {
      console.log("✅ Assinatura salva com sucesso no Supabase.");
      toast.success("Assinatura salva com sucesso!");
      await fetchOrder();
    }
  };

  if (!order) return <div className="p-4">Carregando pedido...</div>;

  const deliveryDate = new Date();
  const vencimento = new Date(deliveryDate.setDate(deliveryDate.getDate() + parseInt(order.days_ticket || "1")));
  const vencimentoStr = vencimento.toLocaleDateString("pt-BR");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold mb-4">Boleto do Pedido #{order.note_number}</h1>
      <p className="mb-2">Cliente: {order.customer}</p>
      <p className="mb-2">Valor total: R$ {order.total?.toFixed(2)}</p>
      <p className="mb-4">Vencimento: {vencimentoStr}</p>

        {/* Assinatura do Cliente */}
        <div className="border border-dashed border-gray-400 rounded p-4">
        <p className="mb-2 font-semibold">Assinatura do cliente:</p>

        <div className="relative">
        <SignatureCanvas
        penColor="black"
        canvasProps={{
          width: 600,
          height: 240,
          className: "w-full h-[200px] sm:h-[240px] border rounded bg-white",
        }}
        ref={(ref) => setSigPad(ref)}
      />
            
            <div className="mt-2 flex flex-wrap gap-2 sm:flex-nowrap">
            <Button
                variant="secondary"
                onClick={() => sigPad?.clear()}
                type="button"
            >
                Limpar
            </Button>

            <Button
            variant="outline"
            onClick={() => {
              const canvas = sigPad?.getTrimmedCanvas?.(); 
                const container = canvas?.parentElement;

                if (window.innerWidth < 768) {
                setIsMobileFullscreen(true); // abre modal para mobile
                } else if (document.fullscreenElement) {
                document.exitFullscreen();
                } else if (container?.requestFullscreen) {
                container.requestFullscreen();
                } else {
                toast.error("Seu navegador não suporta tela cheia.");
                }
            }}
            type="button"
            >
            Tela cheia
            </Button>

            <Button
                onClick={handleSaveSignature}
                className="ml-auto"
                disabled={!!signatureData}
                type="button"
            >
                Salvar Assinatura
            </Button>
            </div>
        </div>
        </div>

        {isMobileFullscreen && (
  <div className="fixed inset-0 z-50 flex flex-col justify-center items-center p-4 sm:hidden">
    <p className="text-lg font-semibold mb-2">Assinatura do Cliente</p>
    <SignatureCanvas
      penColor="black"
      canvasProps={{
        width: window.innerWidth - 40,
        height: 200,
        className: "border rounded bg-white w-full",
      }}
      ref={(ref) => setSigPad(ref)}
    />
    <div className="flex gap-2 mt-4 w-full">
      <Button
        variant="secondary"
        onClick={() => sigPad?.clear()}
        className="w-full"
      >
        Limpar
      </Button>
      <Button
        onClick={async () => {
          await handleSaveSignature();
          setIsMobileFullscreen(false);
        }}
        className="w-full"
      >
        Salvar
      </Button>
    </div>
    <Button
      variant="ghost"
      className="absolute top-4 right-4"
      onClick={() => setIsMobileFullscreen(false)}
    >
      Fechar
    </Button>
  </div>
)}

      {signatureData && (
        <div className="mt-6 space-y-4">
          <p className="font-semibold">Boleto com assinatura:</p>
          <PDFDownloadLink
            document={<BoletoPDF order={order} signatureData={signatureData} vencimentoStr={vencimentoStr} />}
            fileName={`boleto-pedido-${order.note_number}.pdf`}
          >
            {({ loading }) => (
              <Button variant="default">
                {loading ? "Gerando PDF..." : "Download do Boleto com Assinatura"}
              </Button>
            )}
          </PDFDownloadLink>
          {/* <div className="flex gap-4">
            <Button onClick={() => window.print()}>Imprimir</Button>
            <Button variant="outline">Enviar por WhatsApp</Button>
            <Button variant="outline">Enviar por Email</Button>
          </div> */}
        </div>
      )}
    </div>
  );
}