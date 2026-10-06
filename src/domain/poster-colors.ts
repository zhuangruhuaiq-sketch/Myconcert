export type Pixels = { width: number; height: number; channels: number; data: ArrayLike<number> };

const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0")).join("");

export function rgb(value: string) {
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
}

export function samplePixel(image: Pixels, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const left = (width - image.width * scale) / 2;
  const top = (height - image.height * scale) / 2;
  if (x < left || y < top || x >= left + image.width * scale || y >= top + image.height * scale) return null;
  const px = Math.min(image.width - 1, Math.floor((x - left) / scale));
  const py = Math.min(image.height - 1, Math.floor((y - top) / scale));
  const index = (py * image.width + px) * image.channels;
  if (image.channels === 4 && image.data[index + 3] < 128) return null;
  if (image.channels === 2 && image.data[index + 1] < 128) return null;
  const r = image.data[index];
  return image.channels < 3 ? hex(r, r, r) : hex(r, image.data[index + 1], image.data[index + 2]);
}

export function dominantColor(image: Pixels) {
  const bins = new Map<number, { count: number; r: number; g: number; b: number; colorful: boolean }>();
  let colorfulPixels = 0;
  for (let i = 0; i < image.data.length; i += image.channels) {
    if (image.channels === 4 && image.data[i + 3] < 128) continue;
    if (image.channels === 2 && image.data[i + 1] < 128) continue;
    const r = image.data[i], g = image.channels < 3 ? r : image.data[i + 1], b = image.channels < 3 ? r : image.data[i + 2];
    const colorful = Math.max(r, g, b) - Math.min(r, g, b) >= 28 && Math.max(r, g, b) > 35;
    if (colorful) colorfulPixels++;
    const key = (r >> 5) * 1024 + (g >> 5) * 32 + (b >> 5);
    const bin = bins.get(key) || { count: 0, r: 0, g: 0, b: 0, colorful };
    bin.count++; bin.r += r; bin.g += g; bin.b += b;
    bins.set(key, bin);
  }
  if (!bins.size) return null;
  const preferColor = colorfulPixels >= image.width * image.height * 0.1;
  const winner = [...bins.values()].filter((bin) => !preferColor || bin.colorful).sort((a, b) => b.count - a.count)[0];
  return winner ? hex(winner.r / winner.count, winner.g / winner.count, winner.b / winner.count) : null;
}

export function hsvToHex(h: number, s: number, v: number) {
  h = ((h % 360) + 360) % 360; s = clamp(s); v = clamp(v);
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function hexToHsv(value: string) {
  const [r, g, b] = rgb(value).map((n) => n / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const h = !delta ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}

export function contrastText(background: string) {
  const [r, g, b] = rgb(background).map((n) => { const c = n / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return r * 0.2126 + g * 0.7152 + b * 0.0722 > 0.18 ? "#000000" : "#ffffff";
}

export function tint(value: string, white = 0.84) {
  return hex(...(rgb(value).map((n) => n + (255 - n) * white) as [number, number, number]));
}
