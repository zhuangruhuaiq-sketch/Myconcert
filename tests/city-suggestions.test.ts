import assert from "node:assert/strict";
import test from "node:test";
import { citySuggestions } from "../src/domain/city-suggestions";

test("Chinese city suggestions prefer recorded names, find middle characters, and stay optional", () => {
  const recorded = ["上海", "杭州"];
  assert.equal(citySuggestions("上", recorded)[0].city, "上海");
  assert.ok(citySuggestions("京", [])[0].city.includes("京"));
  assert.equal(citySuggestions("上海市", [])[0].city, "上海");
  assert.deepEqual(citySuggestions("Paris", recorded), []);
  assert.deepEqual(citySuggestions("不存在的城市名", recorded), []);
  assert.ok(citySuggestions("海", recorded).length <= 6);
});
