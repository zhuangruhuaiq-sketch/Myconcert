import assert from "node:assert/strict";
import test from "node:test";
import { ratingAt } from "../src/domain/rating";

test("dragging across five stars selects half-star steps and clamps the score", () => {
  assert.deepEqual([1, 22, 23, 44, 45, 66, 89, 176, 199, 220, 300].map((x) => ratingAt(x, 220)), [0.5, 0.5, 1, 1, 1.5, 1.5, 2.5, 4, 5, 5, 5]);
});
