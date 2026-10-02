import assert from "node:assert/strict";
import test from "node:test";
import { eventFeed, eventPoster } from "../src/domain/event-feed";
import { calendarPeriod, nextConcert, shiftPeriod } from "../src/domain/calendar";
import { ConcertEvent, validateEvent } from "../src/domain/rules";
import { toCsv, importPreview } from "../src/domain/exchange";
import { mapDocument } from "../src/domain/map-document";
import mapAssets from "../assets/maps/runtime.json";

const event = (id: string, startAt: string): ConcertEvent => ({
  id, title: id, startAt, endAt: new Date(Date.parse(startAt) + 7200000).toISOString(),
  artists: "艺人", city: "上海", venue: "场馆", type: "演唱会", status: "待观看", currency: "CNY",
  price: 58000, color: "#6947c2", expenses: [], tags: [], preparation: [], createdAt: startAt, updatedAt: startAt,
});

test("feed separates at start time and sorts both groups nearest first without mutating records", () => {
  const now = Date.parse("2026-09-28T12:00:00Z");
  const list = [event("far", "2026-12-28T12:00:00Z"), event("old", "2026-01-28T12:00:00Z"),
    event("now", "2026-09-28T12:00:00Z"), event("soon", "2026-09-29T12:00:00Z"), event("recent", "2026-09-27T12:00:00Z")];
  const result = eventFeed(list, now);
  assert.deepEqual(result.upcoming.map((e) => e.id), ["soon", "far"]);
  assert.deepEqual(result.started.map((e) => e.id), ["now", "recent", "old"]);
  assert.equal(list[0].id, "far");
  assert.deepEqual(eventFeed([], now), { upcoming: [], started: [] });
});

test("poster stays attached through validation and full CSV backup, other attachments are retained", () => {
  const e = { ...event("poster", "2026-12-28T12:00:00Z"), media: [
    { id: "ticket", name: "ticket.png", role: "票根", kind: "image" as const, uri: "data:image/png;base64,AAAA" },
    { id: "poster", name: "poster.png", role: "海报", kind: "image" as const, uri: "data:image/png;base64,BBBB" },
  ] };
  const restored = importPreview(toCsv([validateEvent(e)]), "csv");
  assert.equal(restored.errors.length, 0);
  assert.equal(eventPoster(restored.events[0])?.id, "poster");
  assert.equal(restored.events[0].media?.length, 2);
  assert.equal(eventPoster(event("empty", e.startAt)), undefined);
});

test("calendar periods stay contiguous through year changes, leap day and week boundaries", () => {
  assert.equal(shiftPeriod("2026-12-31", false, 1), "2027-01-01");
  assert.equal(shiftPeriod("2026-03-31", false, -1), "2026-02-01");
  assert.equal(shiftPeriod("2026-12-31", true, 1), "2027-01-07");
  assert.ok(calendarPeriod("2024-02-01", false).days.includes("2024-02-29"));
  assert.ok(!calendarPeriod("2026-02-01", false).days.includes("2026-02-29"));
  assert.equal(calendarPeriod("2026-02-01", false).days.length, 42);
  const current = calendarPeriod("2026-12-31", true);
  const next = calendarPeriod(shiftPeriod("2026-12-31", true, 1), true);
  assert.equal(+current.end, +next.start);
});

test("calendar finds the nearest unfinished show regardless of ticket status", () => {
  const now = Date.parse("2026-09-30T09:00:00Z");
  const far = event("far", "2026-10-10T19:00:00Z");
  const want = { ...event("want", "2026-10-01T19:00:00Z"), status: "想看" as const };
  const sale = { ...event("sale", "2026-10-02T19:00:00Z"), status: "待开票" as const };
  const cancelled = { ...event("cancelled", "2026-09-30T18:00:00Z"), status: "已取消" as const };
  assert.equal(nextConcert([far, sale, want, cancelled], now)?.id, "want");
  assert.equal(nextConcert([far, sale, cancelled], now)?.id, "sale");
  assert.equal(nextConcert([cancelled], now), undefined);
});

test("map is self-contained and known cities do not depend on network geocoding", () => {
  const html = mapDocument([{ city: "上海", count: 2, watched: 1 }]);
  assert.ok(!/<script[^>]+src=/.test(html));
  assert.ok(!/<link[^>]+href=/.test(html));
  assert.ok(mapAssets.world.features.length >= 200);
  assert.ok(mapAssets.cities["上海"].lon > 120 && mapAssets.cities["上海"].lon < 122);
  assert.ok(mapAssets.cities["杭州"].lat > 29 && mapAssets.cities["杭州"].lat < 31);
  assert.ok(html.includes("map.removeLayer(tiles)"));
  assert.ok(html.includes("L.geoJSON(world"));
});
