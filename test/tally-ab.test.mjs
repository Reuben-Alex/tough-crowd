import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { tally } from "../src/tally.mjs";
import { abAnswer, writePanelDir } from "./fixtures/answers.mjs";

const names = ["K", "R"];
const run = async (answers) => {
  const d = await mkdtemp(join(tmpdir(), "vd ab "));
  return { d, out: await writePanelDir({ dir: d, mode: "ab", names, answers }) };
};

test("two of three picks decide the preference", async () => {
  const { d, out } = await run([
    abAnswer(names, { closer: "R" }),
    abAnswer(names, { closer: "R", margin: "slightly", stronger: { ui: "K" } }),
    abAnswer(names, { closer: "K" }),
  ]);
  const { exitCode, panel } = await tally(out, { panelOut: join(d, "PANEL.md") });
  assert.equal(exitCode, 0);
  assert.equal(panel.preferred, "R");
  assert.deepEqual(panel.votes, { K: 1, R: 2, none: 0 });
  assert.deepEqual(panel.margins, ["clearly", "slightly"]);
  assert.deepEqual(panel.criteria.ui, { K: 2, R: 1, none: 0 });
  const md = await readFile(join(out, "PANEL.md"), "utf8");
  assert.ok(md.includes(`**Preferred: ${basename(panel.preferredPath)}** (2 of 3 judges).`));
  await assert.rejects(access(join(d, "PANEL.md")));
});

test("no majority means not preferred", async () => {
  const { d, out } = await run([
    abAnswer(names, { closer: "R" }),
    abAnswer(names, { closer: "K" }),
    abAnswer(names, { closer: "none", margin: null }),
  ]);
  const { panel } = await tally(out, { panelOut: join(d, "PANEL.md") });
  assert.equal(panel.preferred, null);
  assert.ok(
    (await readFile(join(out, "PANEL.md"), "utf8")).includes("**Not preferred: no majority.**"),
  );
});

test("a film name the packet did not issue is refused", async () => {
  const { d, out } = await run([
    abAnswer(names, { closer: "R" }),
    abAnswer(names, { closer: "Q" }),
    abAnswer(names, { closer: "R" }),
  ]);
  await assert.rejects(tally(out, { panelOut: join(d, "PANEL.md") }), /judge-2\.json.*closer/s);
});
