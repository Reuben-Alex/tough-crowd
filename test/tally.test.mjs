import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tally, readFooter } from "../src/tally.mjs";
import { ToolError } from "../src/ffmpeg.mjs";
import { singleAnswer, writePanelDir } from "./fixtures/answers.mjs";

const shots = [
  { start: 0, end: 1.5, name: "the mess" },
  { start: 1.5, end: 3, name: "the ask" },
  { start: 3, end: 4, name: "the proof" },
];
const dir = () => mkdtemp(join(tmpdir(), "vd tally "));
const run = async (answers, over = {}) => {
  const d = await dir();
  const out = await writePanelDir({ dir: d, shots, answers, ...over });
  return { d, out, panelOut: join(d, "PANEL.md") };
};

test("two of three judges rejecting rejects the shot", async () => {
  const { out, panelOut } = await run([
    singleAnswer(shots, { reject: [2] }),
    singleAnswer(shots, { reject: [2, 0] }),
    singleAnswer(shots),
  ]);
  const { exitCode, panel } = await tally(out, { panelOut });
  assert.equal(exitCode, 1);
  assert.deepEqual(panel.rejected, [2]);
  assert.equal(panel.shots[0].rejects, 1);
  assert.equal(panel.shots[0].verdict, "accept");
  assert.equal(panel.roundsLeft, 2);
  const md = await readFile(panelOut, "utf8");
  assert.ok(md.startsWith("# Panel result: round 1 of 3\n**Rejected shots: 1 of 3.**"));
  assert.ok(md.includes("**Not judged: motion at speed, and sound.**"));
  const footer = readFooter(md);
  assert.equal(footer.sha256, panel.sha256);
  assert.deepEqual(footer.rejected, ["3-4 the proof"]);
});

test("one rejection is not a majority", async () => {
  const { out, panelOut } = await run([
    singleAnswer(shots, { reject: [1] }),
    singleAnswer(shots),
    singleAnswer(shots),
  ]);
  assert.equal((await tally(out, { panelOut })).exitCode, 0);
});

test("the bar is reported but does not fail the film", async () => {
  const { out, panelOut } = await run([
    singleAnswer(shots),
    singleAnswer(shots),
    singleAnswer(shots),
  ]);
  const { exitCode, panel } = await tally(out, { panelOut });
  assert.equal(exitCode, 0);
  assert.deepEqual(panel.reachesBar, { yes: 0, no: 3, majority: false });
  assert.ok(
    (await readFile(panelOut, "utf8")).includes("**Reaches the bar: no** (0 of 3 judges)."),
  );
});

test("fenced JSON and capitals are tolerated", async () => {
  const loud = singleAnswer(shots, { reject: [0] });
  loud.shots[0].verdict = "REJECT";
  const fenced = "```json\n" + JSON.stringify(loud) + "\n```";
  const { out, panelOut } = await run([fenced, fenced, singleAnswer(shots)]);
  assert.deepEqual((await tally(out, { panelOut })).panel.rejected, [0]);
});

test("a missing shot is refused, naming the file", async () => {
  const short = singleAnswer(shots);
  short.shots.pop();
  const { out, panelOut } = await run([singleAnswer(shots), short, singleAnswer(shots)]);
  await assert.rejects(
    tally(out, { panelOut }),
    (e) => e instanceof ToolError && /judge-2\.json/.test(e.message),
  );
});

test("prose instead of JSON is refused, never counted as an accept", async () => {
  const { out, panelOut } = await run([
    singleAnswer(shots),
    "Looks great to me!",
    singleAnswer(shots),
  ]);
  await assert.rejects(tally(out, { panelOut }), /judge-2\.json/);
});

test("two answers are not a panel", async () => {
  const { out, panelOut } = await run([singleAnswer(shots), singleAnswer(shots)]);
  await assert.rejects(tally(out, { panelOut }), /Need 3 judges' answers, found 2/);
});

test("must-fix items are grouped by shot with P0 first", async () => {
  const fix = (t, priority) => ({ t, where: "w", problem: "p", change: "c", priority });
  const { out, panelOut } = await run([
    singleAnswer(shots, { mustFix: [fix("3.2-3.8", "P1"), fix("0.5", "p0")] }),
    singleAnswer(shots, { mustFix: [fix("3.5", "P0"), fix("whole film", "P1")] }),
    singleAnswer(shots),
  ]);
  const { panel } = await tally(out, { panelOut });
  assert.deepEqual(
    panel.mustFix.map((m) => [m.shot, m.priority, m.judge]),
    [
      [0, "P0", 1],
      [2, "P0", 2],
      [2, "P1", 1],
      [null, "P1", 2],
    ],
  );
});

test("the last round says there are no rounds left", async () => {
  const { out, panelOut } = await run(
    [
      singleAnswer(shots, { reject: [0] }),
      singleAnswer(shots, { reject: [0] }),
      singleAnswer(shots),
    ],
    { round: 3 },
  );
  await tally(out, { panelOut });
  assert.ok((await readFile(panelOut, "utf8")).includes("No rounds left."));
});

test("the command exits 1 when a shot is rejected and writes PANEL.md beside it", async () => {
  const { d, out } = await run([
    singleAnswer(shots, { reject: [0] }),
    singleAnswer(shots, { reject: [0] }),
    singleAnswer(shots),
  ]);
  const bin = fileURLToPath(new URL("../bin/video-director.mjs", import.meta.url));
  const r = spawnSync(process.execPath, [bin, "tally", out], { cwd: d, encoding: "utf8" });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /Rejected shots: 1 of 3/);
  assert.ok(readFooter(await readFile(join(d, "PANEL.md"), "utf8")));
});
