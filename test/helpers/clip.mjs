import { run } from "../../src/ffmpeg.mjs";

/** Writes a small synthetic test film and returns its path. */
export async function makeClip(file, { seconds = 4, size = "320x180" } = {}) {
  await run("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "lavfi",
    "-i", `testsrc2=duration=${seconds}:size=${size}:rate=30`,
    "-pix_fmt", "yuv420p", file,
  ]);
  return file;
}
