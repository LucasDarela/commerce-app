import bwipjs from "bwip-js";

export async function generateBarcodeBase64(
  barcodeText: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: barcodeText,
        scale: 3,
        height: 10,
        includetext: false,
      },
      (err: any, png: Buffer) => {
        if (err) {
          reject(err);
        } else {
          const base64 = png.toString("base64");
          resolve(`data:image/png;base64,${base64}`);
        }
      },
    );
  });
}
