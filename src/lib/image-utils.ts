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

/**
 * Fast client-side dominant color palette extractor.
 * Samples colors using HTML5 Canvas and quantizes them into distinct, high-fidelity HEX colors.
 * Runs in ~3-8ms with zero network overhead.
 */
export function extractImagePalette(
  imageSrc: string,
  maxColors = 5,
): Promise<string[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !imageSrc) {
      resolve([]);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => {
      // Return empty if image cannot be loaded or blocked by CORS
      resolve([]);
    };

    img.onload = () => {
      try {
        const sampleSize = 48;
        const canvas = document.createElement("canvas");
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve([]);
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

        // Group colors by quantized buckets
        const bucketCounts = new Map<string, { r: number; g: number; b: number; count: number }>();

        for (let i = 0; i < imgData.length; i += 4) {
          const a = imgData[i + 3];
          if (a < 128) continue; // Skip transparent pixels

          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];

          // Quantize to steps of 32 for clean clustering
          const qr = Math.min(255, Math.round(r / 32) * 32);
          const qg = Math.min(255, Math.round(g / 32) * 32);
          const qb = Math.min(255, Math.round(b / 32) * 32);
          const key = `${qr},${qg},${qb}`;

          const existing = bucketCounts.get(key);
          if (existing) {
            existing.r += r;
            existing.g += g;
            existing.b += b;
            existing.count += 1;
          } else {
            bucketCounts.set(key, { r, g, b, count: 1 });
          }
        }

        // Convert buckets to average RGB
        const sorted = Array.from(bucketCounts.values())
          .map((b) => ({
            r: Math.round(b.r / b.count),
            g: Math.round(b.g / b.count),
            b: Math.round(b.b / b.count),
            count: b.count,
          }))
          .sort((a, b) => b.count - a.count);

        const colorDistance = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) => {
          return Math.sqrt(
            Math.pow(c1.r - c2.r, 2) +
            Math.pow(c1.g - c2.g, 2) +
            Math.pow(c1.b - c2.b, 2)
          );
        };

        const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();

        const selected: Array<{ r: number; g: number; b: number }> = [];
        for (const candidate of sorted) {
          // Check distance against already selected colors to ensure distinct palette
          const isDistinct = selected.every((s) => colorDistance(s, candidate) > 42);
          if (isDistinct) {
            selected.push(candidate);
            if (selected.length >= maxColors) break;
          }
        }

        const hexColors = selected.map((c) => `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`);
        resolve(hexColors);
      } catch {
        resolve([]);
      }
    };

    img.src = imageSrc;
  });
}
