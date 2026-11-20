import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("five briefs, each silent, fictional and not a slideshow", async () => {
  const files = (await readdir(new URL("../bench/briefs/", import.meta.url))).sort();
  assert.deepEqual(files, [
    "01-tally.md", "02-ferry.md", "03-pocketleaf.md", "04-gauge.md", "05-loop.md",
  ]);
  for (const f of files) {
    const b = await read(`bench/briefs/${f}`);
    for (const phrase of ["1920x1080", "Not a slideshow.", "fictional", "Visuals only."]) {
      assert.ok(b.includes(phrase), `${f}: ${phrase}`);
    }
  }
  assert.ok(
    (await read("bench/briefs/01-tally.md")).includes(
      "turns messy meeting notes into a clean task list",
    ),
  );
});

test("the procedure states the pass rule and the early stop", async () => {
  const p = await read("bench/PROCEDURE.md");
  for (const phrase of [
    "at least 4 of 5", "two briefs are lost", "calibration", "--ab", "word for word",
  ]) {
    assert.ok(p.includes(phrase), phrase);
  }
});

test("the README states the limits", async () => {
  const r = await read("README.md");
  assert.ok(r.includes("motion at speed") && r.includes("sound") && r.includes("Apache-2.0"));
});

test("the owner's pick is blind and reference frames are documented", async () => {
  assert.ok((await read("bench/PROCEDURE.md")).includes("neutral names"));
  assert.ok((await read("bench/PROCEDURE.md")).includes("from the plugin project folder"));
  assert.ok((await read("README.md")).includes("--refs"));
});
