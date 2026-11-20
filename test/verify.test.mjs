import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { verify } from "../src/verify.mjs";
import { tally } from "../src/tally.mjs";
import { singleAnswer, writePanelDir } from "./fixtures/answers.mjs";

const shots = [
  { start: 0, end: 2, name: "one" },
  { start: 2, end: 4, name: "two" },
];
const judged = async (reject) => {
  const d = await mkdtemp(join(tmpdir(), "vd verify "));
  const a = () => singleAnswer(shots, { reject });
  const out = await writePanelDir({ dir: d, shots, answers: [a(), a(), a()] });
  const panel = join(d, "PANEL.md");
  const { panel: p } = await tally(out, { panelOut: panel });
  return { d, film: p.film, panel };
};

test("a judged film with rejections passes and lists them", async () => {
  const { film, panel } = await judged([1]);
  const r = await verify(film, { panel });
  assert.equal(r.exitCode, 0);
  assert.deepEqual(r.lines.slice(0, 3), [
    "Judged in round 1 of 3.",
    "Open rejections (the delivery note must lead with these):",
    "- 2-4 two",
  ]);
  assert.match(r.lines.at(-1), /does not reach the bar/);
});

test("a clean film says so", async () => {
  const { film, panel } = await judged([]);
  assert.ok((await verify(film, { panel })).lines.includes("No open rejections."));
});

test("a film changed after judging is refused", async () => {
  const { film, panel } = await judged([]);
  await appendFile(film, "x");
  const r = await verify(film, { panel });
  assert.equal(r.exitCode, 2);
  assert.match(r.lines[0], /changed after it was judged/);
});

test("no panel result is refused", async () => {
  const { film } = await judged([]);
  const r = await verify(film, { panel: join(tmpdir(), "no-such-PANEL.md") });
  assert.equal(r.exitCode, 2);
  assert.match(r.lines[0], /has not been judged/);
});

test("the command finds PANEL.md in the current folder and exits 2 on a changed film", async () => {
  const { d, film } = await judged([]);
  const bin = fileURLToPath(new URL("../bin/video-director.mjs", import.meta.url));
  const run = () => spawnSync(process.execPath, [bin, "verify", film], { cwd: d, encoding: "utf8" });
  const ok = run();
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Judged in round 1 of 3\./);
  await appendFile(film, "x");
  assert.equal(run().status, 2);
});
