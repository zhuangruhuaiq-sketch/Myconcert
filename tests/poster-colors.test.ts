import assert from "node:assert/strict";
import test from "node:test";
import { contrastText, dominantColor, hexToHsv, hsvToHex, samplePixel, tint } from "../src/domain/poster-colors";
import { validateEvent, type ConcertEvent } from "../src/domain/rules";
import { importPreview, toCsv } from "../src/domain/exchange";

test("PNG decoder loads without latin1 TextDecoder and preserves transparent pixels", async () => {
  const original = globalThis.TextDecoder;
  Object.defineProperty(globalThis, "TextDecoder", { configurable: true, value: class {
    constructor(encoding?: string) { if (encoding === "latin1") throw new RangeError("Unsupported encoding"); }
  } });
  try {
    const { decodePngPixels } = await import("../src/domain/png-pixels");
    const { default: UPNG } = await import("upng-js");
    const rgba = Uint8Array.from([220, 20, 20, 255, 0, 0, 0, 0]);
    const png = UPNG.encode([rgba.buffer], 2, 1, 0);
    const pixels = decodePngPixels(new Uint8Array(png));
    assert.equal(samplePixel(pixels, 0, 0, 2, 1), "#dc1414");
    assert.equal(samplePixel(pixels, 1, 0, 2, 1), null);
  } finally {
    Object.defineProperty(globalThis, "TextDecoder", { configurable: true, value: original });
  }
});

test("poster palette samples the displayed image and ignores letterbox and transparent pixels", () => {
  const image = { width: 2, height: 2, channels: 4, data: Uint8Array.from([
    220, 20, 20, 255, 220, 20, 20, 255,
    20, 20, 220, 255, 0, 0, 0, 0,
  ]) };
  assert.equal(dominantColor(image), "#dc1414");
  assert.equal(samplePixel(image, 0, 0, 200, 100), null);
  assert.equal(samplePixel(image, 50, 25, 200, 100), "#dc1414");
  assert.equal(samplePixel(image, 125, 75, 200, 100), null);
});

test("sliding hue and color board produces stable colors and readable text", () => {
  assert.equal(hsvToHex(0, 1, 1), "#ff0000");
  assert.equal(hsvToHex(120, 1, 1), "#00ff00");
  const color = "#377eb8";
  const hsv = hexToHsv(color);
  assert.equal(hsvToHex(hsv.h, hsv.s, hsv.v), color);
  assert.equal(contrastText("#171421"), "#ffffff");
  assert.equal(contrastText("#eee7fb"), "#000000");
  assert.equal(tint("#000000"), "#d6d6d6");
});

test("card appearance survives validation and full CSV backup; legacy records keep defaults", () => {
  const base: ConcertEvent = {
    id: "a", title: "演出", artists: "艺人", type: "演唱会", city: "上海", venue: "场馆",
    status: "已观看", startAt: "2026-01-01T10:00:00Z", endAt: "2026-01-01T12:00:00Z",
    currency: "CNY", color: "#9b7cff", tags: [], expenses: [], preparation: [],
    createdAt: "2026-01-01T10:00:00Z", updatedAt: "2026-01-01T10:00:00Z",
  };
  assert.equal(validateEvent(base).cardBackground, undefined);
  const styled = validateEvent({ ...base, cardBackground: "solid", posterColor: "#204060", cardSolidColor: "#eeaa44" });
  assert.deepEqual(importPreview(toCsv([styled]), "csv").events[0], styled);
  assert.deepEqual(importPreview(JSON.stringify({ version: 2, events: [styled] }), "json").events[0], styled);
  assert.throws(() => validateEvent({ ...base, posterColor: "red" }));
});
