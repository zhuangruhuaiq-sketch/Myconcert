import UPNG from "upng-js";
import type { Pixels } from "./poster-colors";

export function decodePngPixels(bytes: Uint8Array): Pixels {
  const png = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return { width: png.width, height: png.height, channels: 4, data: new Uint8Array(UPNG.toRGBA8(png)[0]) };
}
