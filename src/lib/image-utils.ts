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
