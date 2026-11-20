import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packet } from "../src/packet.mjs";
import { makeSheets, boundaryStrips } from "../src/sheets.mjs";
import { ToolError } from "../src/ffmpeg.mjs";
import { makeClip } from "./helpers/clip.mjs";

const DIRECTION = "```shots\n0-1.5 | hidden one\n1.5-4 | hidden two\n```\n";
const setup = async () => {
  const dir = await mkdtemp(join(tmpdir(), "vd packet with space "));
  const film = await makeClip(join(dir, "my film.mp4"));
  const brief = join(dir, "BRIEF.md");
  const direction = join(dir, "DIRECTION.md");
  await writeFile(brief, "Make a calm film for Tally.");
  await writeFile(direction, DIRECTION);
  return { dir, film, brief, direction };
};

test("single mode writes the packet and the key", async () => {
  const { dir, film, brief, direction } = await setup();
  const r = await packet({ film, brief, direction, out: join(dir, "out"), silent: true });
  const key = JSON.parse(await readFile(join(r.out, "key.json"), "utf8"));
  assert.equal(key.mode, "single");
  assert.equal(key.round, 1);
  assert.equal(key.maxRounds, 3);
  assert.match(key.films[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal(key.shots.length, 2);
  assert.deepEqual(await readdir(r.answersDir), []);
  assert.equal((await readdir(join(r.out, "judges", "film", "strips"))).length, 1);
  const text = await readFile(r.brief, "utf8");
  assert.ok(text.includes("Make a calm film for Tally.") && !text.includes("hidden one"));
  assert.equal(r.judges, 3);
});

test("A/B mode hides which film is which", async () => {
  const { dir, film, brief } = await setup();
  const other = await makeClip(join(dir, "stock baseline.mp4"));
  const r = await packet({ film, ab: other, brief, out: join(dir, "ab"), seed: 7 });
  const key = JSON.parse(await readFile(join(r.out, "key.json"), "utf8"));
  const names = key.films.map((f) => f.neutral);
  assert.equal(new Set(names).size, 2);
  for (const n of names) assert.match(n, /^[KMRTXZ]$/);
  const text = await readFile(r.brief, "utf8");
  assert.ok(!text.includes("my film") && !text.includes("stock baseline"));
  await assert.rejects(readdir(join(r.out, "judges", names[0], "strips")));
  const again = await packet({ film, ab: other, brief, out: join(dir, "ab2"), seed: 7 });
  const key2 = JSON.parse(await readFile(join(again.out, "key.json"), "utf8"));
  assert.deepEqual(
    key2.films.map((f) => f.neutral),
    names,
  );
});

test("falls back to unlabelled sheets when labels cannot be drawn", async () => {
  const { dir, film, brief, direction } = await setup();
  const failing = (o) =>
    o.labels === false ? makeSheets(o) : Promise.reject(new ToolError("no font"));
  const r = await packet(
    { film, brief, direction, out: join(dir, "out") },
    { makeSheets: failing, boundaryStrips },
  );
  assert.equal(r.labels, false);
  assert.ok((await readFile(r.brief, "utf8")).includes("Tiles are not time-stamped"));
});

for (const [why, over] of [
  ["single mode without a direction", { direction: undefined }],
  ["a fourth round", { round: 4 }],
  ["an even number of judges", { judges: 4 }],
]) {
  test(`refuses ${why}`, async () => {
    const { dir, film, brief, direction } = await setup();
    await assert.rejects(
      packet({ film, brief, direction, out: join(dir, "out"), ...over }),
      ToolError,
    );
  });
}

test("refuses shots that run past the end of the film", async () => {
  const { dir, film, brief } = await setup();
  const direction = join(dir, "LONG.md");
  await writeFile(direction, "```shots\n0-2 | a\n2-9 | b\n```\n");
  await assert.rejects(packet({ film, brief, direction, out: join(dir, "out") }), /2-9/);
});

for (const [why, body] of [
  ["a gap between shots", "0-1.5 | a\n2.5-4 | b"],
  ["a last shot that ends early", "0-2 | a\n2-3 | b"],
  ["a first shot that starts late", "1-2 | a\n2-4 | b"],
]) {
  test(`refuses ${why}: the shots must cover the whole film`, async () => {
    const { dir, film, brief } = await setup();
    const direction = join(dir, "PART.md");
    await writeFile(direction, "```shots\n" + body + "\n```\n");
    await assert.rejects(
      packet({ film, brief, direction, out: join(dir, "out") }),
      /cover the whole film/,
    );
  });
}
