import bwipjs from "bwip-js";

export async function generateBarcodeBase64(code: string) {
  return new Promise<string>((resolve, reject) => {
    try {
      bwipjs.toBuffer(
        {
          bcid: "code128", // padrão para boletos
          text: code,
          scale: 3,
          height: 10,
          includetext: false,
        },
        (err, png) => {
          if (err) {
            reject(err);
          } else {
            const base64 = `data:image/png;base64,${png.toString("base64")}`;
            resolve(base64);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}