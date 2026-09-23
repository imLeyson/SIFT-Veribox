/**
 * Client-side image compression and processing helper.
 * Scales images to within maxDimension to protect network latency and stay
 * well within Vercel API payload constraints while retaining visual fidelity
 * for typography, color palette, and texture extraction.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("请选择有效的图片文件"));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("无法读取图片文件"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("无法解码图片"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        // Fill white background in case of transparent PNG to ensure clean JPEG encoding
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface ProcessedCanvasImage {
  dataUrl: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  fileName: string;
}

export function processImageForCanvas(
  file: File,
  maxDimension = 1600,
  defaultDisplayWidth = 380,
): Promise<ProcessedCanvasImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("请选择有效的图片文件"));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("无法读取图片文件"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("无法解码图片"));
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width || 400;
        const naturalHeight = img.naturalHeight || img.height || 300;

        // Calculate initial display dimensions (Figma-like initial size on canvas)
        const initialWidth = Math.min(defaultDisplayWidth, Math.max(220, naturalWidth));
        const initialHeight = Math.round(initialWidth * (naturalHeight / naturalWidth));

        // Downsample if over maxDimension (e.g. 1600px)
        let targetWidth = naturalWidth;
        let targetHeight = naturalHeight;
        let needsScaling = false;

        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          needsScaling = true;
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
            targetHeight = maxDimension;
          }
        }

        if (!needsScaling && (reader.result as string).length < 800000) {
          // File is already reasonable size, use original dataUrl
          resolve({
            dataUrl: reader.result as string,
            width: initialWidth,
            height: initialHeight,
            naturalWidth,
            naturalHeight,
            fileName: file.name || "Pasted Image",
          });
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            dataUrl: reader.result as string,
            width: initialWidth,
            height: initialHeight,
            naturalWidth,
            naturalHeight,
            fileName: file.name || "Pasted Image",
          });
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const quality = mimeType === "image/jpeg" ? 0.88 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        resolve({
          dataUrl,
          width: initialWidth,
          height: initialHeight,
          naturalWidth,
          naturalHeight,
          fileName: file.name || "Pasted Image",
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
