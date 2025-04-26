export function getTrimmedCanvas(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return canvas;
  
    const { width, height } = canvas;
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
  
    let top = null;
    let left = null;
    let right = null;
    let bottom = null;
  
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 0) {
          if (top === null) top = y;
          if (left === null || x < left) left = x;
          if (right === null || x > right) right = x;
          bottom = y;
        }
      }
    }
  
    if (top === null || left === null || right === null || bottom === null) {
      return canvas;
    }
  
    const trimmedWidth = right - left + 1;
    const trimmedHeight = bottom - top + 1;
    const trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
  
    const trimmedCtx = trimmedCanvas.getContext("2d", { willReadFrequently: true });
    if (!trimmedCtx) return canvas;
  
    trimmedCtx.putImageData(
      context.getImageData(left, top, trimmedWidth, trimmedHeight),
      0,
      0
    );
  
    return trimmedCanvas;
  }