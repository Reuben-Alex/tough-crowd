import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeSheets, boundaryStrips } from "../src/sheets.mjs";
import { probeSize } from "../src/ffmpeg.mjs";
import { makeClip } from "./helpers/clip.mjs";

const setup = async () => {
  const dir = await mkdtemp(join(tmpdir(), "vd sheets "));
  return { dir, film: await makeClip(join(dir, "film.mp4"), { seconds: 4 }) };
};

test("a 4 second film gives two sheets of twelve tiles", async () => {
  const { dir, film } = await setup();
  const sheets = await makeSheets({ film, outDir: join(dir, "s") });
  assert.equal(sheets.length, 2);
  assert.match(sheets[0], /sheet-01\.jpg$/);
  assert.ok((await stat(sheets[1])).size > 1000);
  const { width, height } = await probeSize(sheets[0]);
  assert.ok(width >= 1920 && height >= 1440);
});

test("sheets can be made without labels", async () => {
  const { dir, film } = await setup();
  assert.equal((await makeSheets({ film, outDir: join(dir, "s"), labels: false })).length, 2);
});

test("one strip per boundary between shots", async () => {
  const { dir, film } = await setup();
  const shots = [
    { start: 0, end: 1.5, name: "a" },
    { start: 1.5, end: 3, name: "b" },
    { start: 3, end: 4, name: "c" },
  ];
  const strips = await boundaryStrips({ film, outDir: join(dir, "strips"), shots, duration: 4 });
  assert.deepEqual(strips.map((s) => s.at), [1.5, 3]);
  assert.ok((await stat(strips[1].path)).size > 1000);
});

test("a single shot has no strips", async () => {
  const { dir, film } = await setup();
  const strips = await boundaryStrips({
    film,
    outDir: join(dir, "strips"),
    shots: [{ start: 0, end: 4, name: "a" }],
    duration: 4,
  });
  assert.deepEqual(strips, []);
});

test("a tile shows the frame at its labelled time, not a later one", async () => {
  const { spawnSync } = await import("node:child_process");
  const { findTool, run } = await import("../src/ffmpeg.mjs");
  const dir = await mkdtemp(join(tmpdir(), "vd timing "));
  const film = join(dir, "red-then-blue.mp4");
  // Red until 0.8 s, blue after. The tile for 0.75 s must still be red.
  await run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", "color=red:s=320x180:d=0.8:r=30",
    "-f", "lavfi", "-i", "color=blue:s=320x180:d=1.2:r=30",
    "-filter_complex", "[0:v][1:v]concat=n=2:v=1,format=yuv420p", film,
  ]);
  const [sheet] = await makeSheets({ film, outDir: join(dir, "s"), labels: false });
  // Tile 4 (0.75 s) is the first tile of the second row: its centre is near (320, 546).
  const px = spawnSync(findTool("ffmpeg"), [
    "-loglevel", "error", "-i", sheet, "-vf", "crop=8:8:316:542", "-frames:v", "1",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
  ]).stdout;
  assert.ok(px[0] > 150 && px[2] < 100, `tile at 0.75 s should be red, got rgb(${px[0]},${px[1]},${px[2]})`);
});
