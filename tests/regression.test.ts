import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConcertEvent,
  defaults,
  onDay,
  overlap,
  parseLocal,
  parseMoney,
  totalsByCurrency,
  validateBackup,
  validateEvent,
} from "../src/domain/rules";
import {
  importPreview,
  mergeEvents,
  toCsv,
  toIcs,
} from "../src/domain/exchange";
import {
  CURRENT_KEY,
  LEGACY_KEY,
  RecoveryError,
  repository,
} from "../src/data/repository";
const event: ConcertEvent = {
  id: "record-1",
  title: "Myconcert 测试,分号;与\\换行\n",
  artists: "示例",
  type: "音乐节",
  startAt: "2026-12-31T12:00:00.000Z",
  endAt: "2027-01-02T12:00:00.000Z",
  status: "待观看",
  city: "上海",
  venue: "示例场馆",
  currency: "CNY",
  color: "#abcdef",
  tags: ["新年"],
  expenses: [],
  preparation: [],
  createdAt: "2026-12-01T00:00:00.000Z",
  updatedAt: "2026-12-01T00:00:00.000Z",
};
const backup = { version: 2, events: [event], preferences: defaults };
function memory() {
  const map = new Map<string, string>();
  let fail = false;
  return {
    map,
    fail: () => {
      fail = true;
    },
    port: {
      get: async (key: string) => map.get(key) ?? null,
      set: async (key: string, value: string) => {
        if (fail) {
          fail = false;
          throw new Error("disk full");
        }
        map.set(key, value);
      },
    },
  };
}
test("exact money conversion and invalid input rejection", () => {
  assert.equal(parseMoney("0.29"), 29);
  assert.equal(parseMoney("12.3"), 1230);
  for (const input of ["-1", "NaN", "Infinity", "1.001", "1e3", ""])
    assert.throws(() => parseMoney(input));
  assert.throws(() => parseLocal("2026-02-30T19:00"));
  assert.throws(() => parseLocal("garbage"));
});
test("cross-day events and cancellation conflict rules", () => {
  assert.ok(onDay(event, "2027-01-01"));
  assert.ok(!onDay(event, "2027-01-03"));
  const other = { ...event, id: "other" };
  assert.ok(overlap(event, other));
  assert.ok(!overlap(event, { ...other, status: "已取消" }));
  assert.ok(
    !overlap(event, {
      ...other,
      startAt: event.endAt,
      endAt: "2027-01-03T12:00:00.000Z",
    }),
  );
});
test("validation rejects corrupt amounts, dates, types and restores optional legacy arrays", () => {
  assert.throws(() => validateEvent({ ...event, endAt: event.startAt }));
  assert.throws(() => validateEvent({ ...event, price: NaN }));
  assert.throws(() => validateEvent({ ...event, rating: NaN }));
  assert.throws(() =>
    validateEvent({ ...event, startAt: "2026-02-30T10:00:00.000Z" }),
  );
  assert.throws(() => validateEvent({ ...event, tags: "bad" }));
  assert.throws(() =>
    validateEvent({
      ...event,
      reminders: [{ id: "x", at: "bad", label: "test" }],
    }),
  );
  assert.deepEqual(validateEvent({ ...event, tags: undefined }).tags, []);
  assert.throws(() => validateBackup({ ...backup, events: [event, event] }));
});
test("new preferences keep legacy defaults and survive validation", () => {
  const legacy = validateBackup({ ...backup, preferences: { theme: "light" } }).preferences;
  assert.equal(legacy.hidePrice, false);
  assert.equal(legacy.defaultCity, "");
  assert.equal(legacy.defaultCurrency, "CNY");
  assert.equal(legacy.calendarView, "月历");
  const saved = validateBackup({
    ...backup,
    preferences: {
      theme: "light",
      hidePrice: true,
      defaultCity: " 北京 ",
      defaultCurrency: "USD",
      calendarView: "周视图",
    },
  }).preferences;
  assert.equal(saved.hidePrice, true);
  assert.equal(saved.defaultCity, "北京");
  assert.equal(saved.defaultCurrency, "USD");
  assert.equal(saved.calendarView, "周视图");
  assert.throws(() => validateBackup({ ...backup, preferences: { theme: "light", hidePrice: "yes" } }));
  assert.throws(() => validateBackup({ ...backup, preferences: { theme: "light", calendarView: "未知" } }));
});
test("portable JSON preserves settings and embedded media", () => {
  const e = {
    ...event,
    media: [
      {
        id: "photo",
        uri: "data:image/png;base64,AAAA",
        name: "photo.png",
        kind: "image",
        role: "票根",
      },
    ],
  };
  const content = JSON.stringify({
    ...backup,
    events: [e],
    preferences: { theme: "dark" },
  });
  const result = importPreview(content, "json");
  assert.equal(result.errors.length, 0);
  assert.equal(result.preferences?.theme, "dark");
  assert.equal(result.events[0].media?.[0].uri, e.media[0].uri);
});
test("CSV handles quotes, multiline and formula-like names; full records roundtrip", () => {
  const e = {
    ...event,
    title: '=SUM(1,2) "quoted"\nsecond line',
    note: "private",
  };
  const result = importPreview(toCsv([e]), "csv");
  assert.equal(result.errors.length, 0);
  assert.equal(result.events[0].title, e.title);
  assert.equal(result.events[0].note, "private");
  assert.equal(result.events[0].startAt, event.startAt);
});
test("ICS escapes content, folds lines, excludes private fields and roundtrips intervals", () => {
  const e = {
    ...event,
    title: event.title.repeat(10),
    note: "ORDER-SECRET",
    address: "PRIVATE-ADDRESS",
  };
  const content = toIcs([e]);
  assert.ok(!content.includes("SECRET"));
  assert.ok(!content.includes("PRIVATE"));
  assert.ok(
    content.split("\r\n").every((line) => Buffer.byteLength(line) <= 75),
  );
  const result = importPreview(content, "ics");
  assert.equal(result.errors.length, 0);
  assert.equal(result.events[0].title, e.title);
  assert.equal(result.events[0].startAt, e.startAt);
  assert.equal(result.events[0].endAt, e.endAt);
  assert.equal(result.events[0].id, e.id);
});
test("import preview isolates errors and merges duplicates explicitly", () => {
  const result = importPreview(
    JSON.stringify([event, { id: "broken" }]),
    "json",
  );
  assert.equal(result.events.length, 1);
  assert.equal(result.errors.length, 1);
  const updated = { ...event, title: "changed" };
  assert.equal(mergeEvents([event], [updated], "skip")[0].title, event.title);
  assert.equal(mergeEvents([event], [updated], "replace")[0].title, "changed");
});
test("separate currencies are not summed into one total", () => {
  assert.deepEqual(
    totalsByCurrency([
      { ...event, price: 100 },
      { ...event, id: "usd", currency: "USD", price: 200 },
    ]),
    { CNY: 100, USD: 200 },
  );
});
test("legacy migration keeps raw backup and identifiers", async () => {
  const m = memory();
  const raw = JSON.stringify([event]);
  m.map.set(LEGACY_KEY, raw);
  const repo = repository(m.port, []);
  const state = await repo.load();
  assert.equal(state.events[0].id, event.id);
  assert.equal(m.map.get("myconcert.pre-migration.v1"), raw);
  assert.ok(m.map.has(CURRENT_KEY));
});
test("corrupt data never gets replaced with seed data", async () => {
  const m = memory();
  m.map.set(CURRENT_KEY, "{broken");
  const repo = repository(m.port, [event]);
  await assert.rejects(repo.load(), RecoveryError);
  assert.equal(m.map.get(CURRENT_KEY), "{broken");
  await assert.rejects(
    repo.mutate((x) => x),
    /加载/,
  );
});
test("serialized writes use latest state; failed writes do not publish or poison queue", async () => {
  const m = memory();
  const repo = repository(m.port, [event]);
  await repo.load();
  const add = (name: string) =>
    repo.mutate((b) => ({
      ...b,
      events: b.events.map((e) => ({
        ...e,
        preparation: [...e.preparation, { id: name, title: name, done: false }],
      })),
    }));
  await Promise.all([add("a"), add("b")]);
  m.fail();
  await assert.rejects(add("failed"), /disk full/);
  await add("c");
  const state = JSON.parse(m.map.get(CURRENT_KEY)!);
  assert.deepEqual(
    state.events[0].preparation.map((x: { id: string }) => x.id),
    ["a", "b", "c"],
  );
});
test("actual backup files roundtrip through JSON, CSV and ICS parsers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "myconcert-test-"));
  try {
    const formats = {
      json: JSON.stringify(backup),
      csv: toCsv([event]),
      ics: toIcs([event]),
    };
    for (const format of ["json", "csv", "ics"] as const) {
      const filename = join(dir, "myconcert." + format);
      await writeFile(filename, formats[format], "utf8");
      const preview = importPreview(await readFile(filename, "utf8"), format);
      assert.equal(preview.errors.length, 0);
      assert.equal(preview.events.length, 1);
      assert.equal(preview.events[0].id, event.id);
      assert.equal(preview.events[0].endAt, event.endAt);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("delete persists, restart does not reseed, and backup restores deleted records", async () => {
  const m = memory();
  const repo = repository(m.port, [event]);
  await repo.load();
  await repo.mutate((b) => ({ ...b, events: [] }));
  const restarted = repository(m.port, [event]);
  assert.equal((await restarted.load()).events.length, 0);
  const preview = importPreview(JSON.stringify(backup), "json");
  const restored = await restarted.mutate((b) => ({
    ...b,
    events: mergeEvents(b.events, preview.events, "skip"),
  }));
  assert.equal(restored.events[0].id, event.id);
});
