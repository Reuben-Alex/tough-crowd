import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShots } from "../src/direction.mjs";
import { ToolError } from "../src/ffmpeg.mjs";

const doc = (body) => "# Direction\n\nThe idea.\n\n```shots\n" + body + "\n```\n";

test("reads shots in order", () => {
  assert.deepEqual(parseShots(doc("0.0-1.3 | the mess\n1.3 - 4.2 | the ask")), [
    { start: 0, end: 1.3, name: "the mess" },
    { start: 1.3, end: 4.2, name: "the ask" },
  ]);
});

for (const [why, body] of [
  ["no shots block", null],
  ["overlap", "0-2 | a\n1.5-3 | b"],
  ["end before start", "2-1 | a"],
  ["unreadable line", "0 to 2, a"],
  ["empty block", ""],
]) {
  test(`rejects: ${why}`, () => {
    assert.throws(() => parseShots(body === null ? "# nothing" : doc(body)), ToolError);
  });
}

test("rejects two shots blocks", () => {
  assert.throws(() => parseShots(doc("0-1 | a") + doc("1-2 | b")), /one shots block/);
});
