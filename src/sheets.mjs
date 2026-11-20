import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { run } from "./ffmpeg.mjs";

const SHEET = { fps: 4, width: 640, height: 360, cols: 3, rows: 4 };
const STRIP = { fps: 12, width: 480, height: 270, cols: 6, half: 0.5 };
const PADDING = "padding=6:color=black";

/** A burned-in film-time label. `offset` is added when the input was seeked. */
const label = (size, offset = 0) =>
  `drawtext=text='%{pts\\:hms\\:${offset}}':x=8:y=8:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.65`;

const chain = (...stages) => stages.filter(Boolean).join(",");

const number = (n) => String(n).padStart(2, "0");

/** Contact sheets of the whole film: 4 frames a second, 12 tiles a sheet. */
export async function makeSheets({ film, outDir, labels = true }) {
  await mkdir(outDir, { recursive: true });
  const filter = chain(
    `fps=${SHEET.fps}`,
    `scale=${SHEET.width}:${SHEET.height}`,
    labels && label(20),
    `tile=${SHEET.cols}x${SHEET.rows}:${PADDING}`,
  );
  await run("ffmpeg", [
    "-y", "-loglevel", "error", "-i", film, "-vf", filter, "-fps_mode", "vfr",
    join(outDir, "sheet-%02d.jpg"),
  ]);
  const files = (await readdir(outDir)).filter((f) => /^sheet-\d+\.jpg$/.test(f)).sort();
  return files.map((f) => resolve(outDir, f));
}

/** One denser strip across each boundary between consecutive shots. */
export async function boundaryStrips({ film, outDir, shots, duration, labels = true }) {
  const boundaries = shots.slice(0, -1).map((shot) => shot.end);
  if (boundaries.length === 0) return [];
  await mkdir(outDir, { recursive: true });
  const strips = [];
  for (const [index, at] of boundaries.entries()) {
    const from = Math.max(0, at - STRIP.half);
    const length = Math.min(duration, at + STRIP.half) - from;
    const rows = Math.max(1, Math.ceil(Math.round(length * STRIP.fps) / STRIP.cols));
    const path = resolve(outDir, `strip-${number(index + 1)}.jpg`);
    const filter = chain(
      `fps=${STRIP.fps}`,
      `scale=${STRIP.width}:${STRIP.height}`,
      labels && label(16, from),
      `tile=${STRIP.cols}x${rows}:${PADDING}`,
    );
    await run("ffmpeg", [
      "-y", "-loglevel", "error", "-ss", String(from), "-t", String(length), "-i", film,
      "-vf", filter, "-frames:v", "1", path,
    ]);
    strips.push({ at, path });
  }
  return strips;
}
