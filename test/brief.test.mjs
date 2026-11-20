import { test } from "node:test";
import assert from "node:assert/strict";
import { renderBrief, CRITERIA } from "../src/brief.mjs";

const film = (neutral) => ({
  neutral,
  sheets: [`/p/${neutral}/sheet-01.jpg`],
  strips: [{ at: 1.3, path: `/p/${neutral}/strips/strip-01.jpg` }],
});
const shots = [
  { start: 0, end: 1.3, name: "SECRET INTENT" },
  { start: 1.3, end: 4, name: "the ask" },
];
const single = (over = {}) =>
  renderBrief({
    mode: "single",
    briefText: "Make a film for Tally.",
    silent: true,
    labels: true,
    films: [film("film")],
    shots,
    refs: [],
    ...over,
  });

test("single brief carries the bar, the ranges and no author intent", () => {
  const b = single();
  assert.ok(b.includes("Merely tidy UI on a flat background is below the bar."));
  assert.ok(b.includes("Make a film for Tally."));
  assert.ok(b.includes("0-1.3") && b.includes("1.3-4"));
  assert.ok(!b.includes("SECRET INTENT") && !b.includes("the ask"));
  assert.ok(b.includes("/p/film/sheet-01.jpg") && b.includes("/p/film/strips/strip-01.jpg"));
  assert.ok(b.includes("do not mark down for missing sound"));
  for (const c of CRITERIA) assert.ok(b.includes(`"${c}"`));
  assert.ok(b.includes("## Reply with only this JSON object"));
});

test("silent line is absent when the film has sound", () => {
  assert.ok(!single({ silent: false }).includes("do not mark down for missing sound"));
});

test("unlabelled sheets explain how to read tile times", () => {
  assert.ok(single({ labels: false }).includes("((sheet - 1) × 12 + (tile - 1)) ÷ 4"));
});

test("reference frames are listed when given", () => {
  assert.ok(single({ refs: ["/p/refs/a.png"] }).includes("/p/refs/a.png"));
});

test("A/B brief names both films neutrally and asks which is closer", () => {
  const b = renderBrief({
    mode: "ab",
    briefText: "Make a film.",
    silent: true,
    labels: true,
    films: [
      { ...film("K"), strips: [] },
      { ...film("R"), strips: [] },
    ],
    shots: null,
    refs: [],
  });
  assert.ok(b.includes("Neither film is presumed better"));
  assert.ok(b.includes('"closer"') && b.includes('"stronger"'));
  assert.ok(b.includes("Film K") && b.includes("Film R"));
});
