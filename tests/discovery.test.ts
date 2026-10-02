import assert from "node:assert/strict";
import { test } from "node:test";
import { artistSuggestions, groupShows, parseMaoyanList, parseShowstartList } from "../src/domain/discovery";
import { validateBackup, type FoundShow } from "../src/domain/rules";
import { demoEvents } from "../src/data/seed";
import { repository } from "../src/data/repository";
import { importPreview } from "../src/domain/exchange";

test("old backups gain empty discovery without changing events", () => {
  const backup = validateBackup({ version: 2, events: demoEvents, preferences: { theme: "light" } });
  assert.equal(backup.events.length, demoEvents.length);
  assert.deepEqual(backup.discovery, { following: [], results: [], lastSuccess: {} });
  assert(artistSuggestions(demoEvents, []).includes("原创演示阵容"));
  assert(!artistSuggestions(demoEvents, ["原创演示阵容"]).includes("原创演示阵容"));
});

test("following and cached results survive restart and JSON import preview", async () => {
  const values = new Map<string, string>();
  const storage = { get: async (key: string) => values.get(key) ?? null, set: async (key: string, value: string) => { values.set(key, value); } };
  const first = repository(storage, []);
  await first.load();
  await first.mutate((backup) => ({ ...backup, discovery: {
    following: ["许钧"],
    results: [{ title: "巡演", artists: "许钧", city: "北京", venue: "蛙厂", startAt: "2026-10-16T12:00:00.000Z", platform: "秀动", url: "https://www.showstart.com/event/12" }],
    lastSuccess: { 秀动: "2026-09-30T00:00:00.000Z" },
  } }));
  const restored = await repository(storage, []).load();
  assert.deepEqual(restored.discovery.following, ["许钧"]);
  assert.equal(restored.discovery.results.length, 1);
  assert.deepEqual(importPreview(JSON.stringify(restored), "json").discovery, restored.discovery);
});

test("showstart parser accepts named future shows only", () => {
  const html = [
    '<a href="/event/12" class="show-item item"><div class="title">巡演</div><div class="artist">艺人：许钧</div><div class="time">时间：2026/10/16 20:00</div><div class="addr">[北京]蛙厂</div></a>',
    '<a href="/event/13" class="show-item item"><div class="title">致敬许钧</div><div class="artist">艺人：其他人</div><div class="time">时间：2026/10/17 20:00</div><div class="addr">[北京]蛙厂</div></a>',
    '<a href="/event/14" class="show-item item"><div class="title">待定</div><div class="artist">艺人：许钧</div><div class="time">时间待定</div><div class="addr">[北京]蛙厂</div></a>',
  ].join("");
  const found = parseShowstartList(html, "许钧", Date.parse("2026-09-30T00:00:00+08:00"));
  assert.equal(found.length, 1);
  assert.equal(found[0].url, "https://www.showstart.com/event/12");
  assert.equal(found[0].startAt, "2026-10-16T12:00:00.000Z");
  assert.equal(parseShowstartList(html, "许钧", Date.parse("2026-10-17T00:00:00+08:00")).length, 0);
});

test("maoyan parser keeps unambiguous singer dates and rejects tribute or date ranges", () => {
  const payload = { code: 200, data: [
    { performanceId: 505739, name: "许钧2026巡演-成都站", cityName: "成都", shopName: "BPM Live Space", showTimeRange: "2026.10.30 20:00 周五" },
    { performanceId: 2, name: "致敬许钧之夜", showTimeRange: "2026.10.31 20:00" },
    { performanceId: 3, name: "许钧音乐节", showTimeRange: "2026.11.14 / 11.15" },
  ] };
  const found = parseMaoyanList(payload, "许钧", Date.parse("2026-09-30T00:00:00Z"));
  assert.equal(found.length, 1);
  assert.equal(found[0].startAt, "2026-10-30T12:00:00.000Z");
  assert.equal(found[0].url, "https://show.maoyan.com/detail/505739");
});

test("same session merges platforms while different venues remain separate", () => {
  const base: FoundShow = { title: "巡演", artists: "许钧", city: "北京", venue: "蛙厂", startAt: "2026-10-16T12:00:00.000Z", platform: "秀动", url: "https://www.showstart.com/event/12" };
  const groups = groupShows([base, { ...base, artists: "许钧、嘉宾", platform: "大麦", url: "https://detail.damai.cn/item.htm?id=12" }, { ...base, venue: "另一场馆", url: "https://www.showstart.com/event/13" }], Date.parse("2026-09-30T00:00:00Z"));
  assert.equal(groups.length, 2);
  assert.equal(groups[0].links.length, 2);
});
