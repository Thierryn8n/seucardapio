// Conversões de cor e extração automática de paleta a partir de uma imagem (ex.: logo).
// O padrão de cor usado no projeto é uma string HSL sem "hsl()", ex.: "20 85% 55%".

export function hslStringToRgb(hsl: string): [number, number, number] {
  const parts = hsl.trim().split(/\s+/);
  const h = ((parseFloat(parts[0]) || 0) % 360 + 360) % 360;
  const s = Math.min(100, Math.max(0, parseFloat(parts[1]) || 0)) / 100;
  const l = Math.min(100, Math.max(0, parseFloat(parts[2]) || 0)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

export function hslStringToHex(hsl: string): string {
  try {
    const [r, g, b] = hslStringToRgb(hsl);
    return rgbToHex(r, g, b);
  } catch {
    return "#808080";
  }
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function hexToHslString(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const [h, s, l] = rgbToHsl(r, g, b);
  return `${h} ${s}% ${l}%`;
}

function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem da logo"));
    img.src = src;
  });
}

export interface ExtractedPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
}

/**
 * Escaneia os pixels de uma imagem (ex.: a logo da marmitaria) e deriva uma
 * paleta de cores harmônica (primária, secundária, destaque, fundo, texto e cartão).
 */
export async function extractPaletteFromImage(src: string): Promise<ExtractedPalette> {
  const img = await loadImage(src);
  const size = 80;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não é suportado neste navegador");
  ctx.drawImage(img, 0, 0, size, size);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, size, size);
  } catch {
    throw new Error("Não foi possível ler os pixels da logo (imagem de origem externa sem CORS)");
  }
  const { data } = imageData;

  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${Math.round(r / 16)}-${Math.round(g / 16)}-${Math.round(b / 16)}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const colors = Array.from(buckets.values()).map((bucket) => {
    const r = bucket.r / bucket.count;
    const g = bucket.g / bucket.count;
    const b = bucket.b / bucket.count;
    const [h, s, l] = rgbToHsl(r, g, b);
    return { count: bucket.count, h, s, l };
  });

  if (!colors.length) {
    throw new Error("Não foi possível identificar cores na logo");
  }

  const vivid = colors
    .filter((c) => c.s >= 18 && c.l >= 10 && c.l <= 90)
    .sort((a, b) => b.count * (b.s / 100) - a.count * (a.s / 100));

  const byFrequency = [...colors].sort((a, b) => b.count - a.count);

  const picks: typeof colors = [];
  for (const c of vivid) {
    if (picks.some((p) => hueDistance(p.h, c.h) < 25)) continue;
    picks.push(c);
    if (picks.length === 3) break;
  }
  for (const c of byFrequency) {
    if (picks.length === 3) break;
    if (picks.some((p) => hueDistance(p.h, c.h) < 15)) continue;
    picks.push(c);
  }

  const defaults = [
    { h: 20, s: 85, l: 55 },
    { h: 140, s: 45, l: 50 },
    { h: 15, s: 90, l: 60 },
  ];
  const [primaryC, secondaryC, accentC] = [0, 1, 2].map((i) => picks[i] ?? defaults[i]);

  const clampL = (l: number, min: number, max: number) => Math.min(max, Math.max(min, l));
  const baseHue = primaryC.h;

  return {
    primary: `${primaryC.h} ${Math.max(primaryC.s, 40)}% ${clampL(primaryC.l, 35, 60)}%`,
    secondary: `${secondaryC.h} ${Math.max(secondaryC.s, 35)}% ${clampL(secondaryC.l, 35, 60)}%`,
    accent: `${accentC.h} ${Math.max(accentC.s, 40)}% ${clampL(accentC.l, 40, 65)}%`,
    background: `${baseHue} 22% 97%`,
    foreground: `${baseHue} 25% 15%`,
    card: `${baseHue} 15% 99%`,
  };
}
