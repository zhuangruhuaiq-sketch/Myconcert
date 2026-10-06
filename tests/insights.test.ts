import assert from "node:assert/strict";
import test from "node:test";
import { insights } from "../src/domain/insights";
import { mapDocument } from "../src/domain/map-document";
import { ConcertEvent } from "../src/domain/rules";

const base: ConcertEvent = {
  id: "a", title: "test", artists: "A、B、A", type: "音乐节", city: " 上海 ", venue: "",
  status: "已观看", startAt: "2026-09-05T12:00:00Z", endAt: "2026-09-05T14:00:00Z",
  currency: "CNY", price: 10000, rating: 0, color: "#123456", tags: [], expenses: [], preparation: [],
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
};
test("insights exclude plans from attendance, count zero ratings, split artists and separate currencies", () => {
  const s = insights([base, { ...base, id: "b", artists: "A", rating: 5, venue: "剧场", price: 0 },
    { ...base, id: "c", status: "已取消", currency: "USD", price: 400, expenses: [{ id: "x", category: "交通", amount: 100 }] }]);
  assert.equal(s.watched.length, 2);
  assert.deepEqual(s.artists, [["A", 2], ["B", 1]]);
  assert.deepEqual(s.cities, [["上海", 2]]);
  assert.equal(s.venues.length, 1);
  assert.equal(s.hours, 4);
  assert.equal(s.months[8], 2);
  assert.equal(s.averageRating, 2.5);
  assert.equal(s.ratings[0][1], 1);
  assert.equal(s.ratings[5][1], 1);
  assert.deepEqual(s.spending.map((g) => [g.currency, g.total, g.average]), [["CNY", 10000, 5000], ["USD", 500, 500]]);
  assert.equal(insights([]).averageRating, undefined);
  assert.deepEqual(insights([]).spending, []);
});

test("city statistics merge names with and without 市 without changing records", () => {
  const events = [
    { ...base, id: "hangzhou", city: "杭州", venue: "同一场馆" },
    { ...base, id: "hangzhoushi", city: " 杭州市 ", venue: "同一场馆" },
    { ...base, id: "shanghai", city: "上海", venue: "另一场馆" },
    { ...base, id: "yokkaichi", city: "四日市", venue: "海外场馆" },
  ];
  const summary = insights(events);
  assert.deepEqual(summary.cities, [["杭州", 2], ["上海", 1], ["四日市", 1]]);
  assert.deepEqual(summary.venues, [["杭州 · 同一场馆", 2], ["上海 · 另一场馆", 1], ["四日市 · 海外场馆", 1]]);
  assert.equal(events[1].city, " 杭州市 ");
});
test("map document treats imported city text as data, never executable markup", () => {
  const html = mapDocument([{ city: '</script><script>alert("bad")</script>', count: 1, watched: 0 }]);
  assert.ok(!html.includes('</script><script>alert'));
  assert.ok(html.includes('\\u003c/script>'));
  assert.ok(html.includes('osm_tag=place:city'));
});
