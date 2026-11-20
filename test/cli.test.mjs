import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeClip } from "./helpers/clip.mjs";

const BIN = fileURLToPath(new URL("../bin/tough-crowd.mjs", import.meta.url));
const cli = (args, cwd) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });

test("an unknown command prints usage and exits 2", () => {
  const r = cli(["nonsense"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: tough-crowd/);
});

test("a bad input exits 2 with a message, not a stack trace", () => {
  const r = cli([
    "packet", "no-such-film.mp4", "--brief", "no-such-brief.md", "--direction", "no-such.md",
  ]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no-such-film\.mp4/);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
});

test("packet prints its result as JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vd cli "));
  await makeClip(join(dir, "film.mp4"));
  await writeFile(join(dir, "BRIEF.md"), "Make a film.");
  await writeFile(join(dir, "DIRECTION.md"), "```shots\n0-2 | a\n2-4 | b\n```\n");
  const r = cli(["packet", "film.mp4", "--brief", "BRIEF.md", "--direction", "DIRECTION.md"], dir);
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout);
  assert.match(result.out.replaceAll("\\", "/"), /\.director\/panel\/single-r1$/);
  assert.equal(result.judges, 3);
});

test("a name inherited from Object is not a command", () => {
  const r = cli(["toString"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: tough-crowd/);
});

test("an unexpected failure exits 2, never the rejected-shot code", async () => {
  const { mkdir } = await import("node:fs/promises");
  const dir = await mkdtemp(join(tmpdir(), "vd broken "));
  await mkdir(join(dir, "out", "answers"), { recursive: true });
  await writeFile(join(dir, "out", "key.json"), "{ not json");
  const r = cli(["tally", join(dir, "out")], dir);
  assert.equal(r.status, 2, r.stderr);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
  const folder = cli(["packet", "x.mp4", "--brief", dir, "--direction", dir], dir);
  assert.equal(folder.status, 2);
});
