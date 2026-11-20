import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findTool, probeDuration, probeSize, sha256, ToolError } from "../src/ffmpeg.mjs";
import { makeClip } from "./helpers/clip.mjs";

test("findTool explains how to fix a missing FFmpeg", () => {
  assert.throws(
    () => findTool("ffmpeg", { PATH: "" }),
    (e) =>
      e instanceof ToolError &&
      e.exitCode === 2 &&
      /set FFMPEG_PATH and FFPROBE_PATH/.test(e.message),
  );
});

test("findTool rejects an FFMPEG_PATH that does not exist", () => {
  assert.throws(() => findTool("ffmpeg", { FFMPEG_PATH: "/no/such/ffmpeg" }), ToolError);
});

test("probes a clip in a folder with a space", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vd probe "));
  const clip = await makeClip(join(dir, "a clip.mp4"));
  assert.ok(Math.abs((await probeDuration(clip)) - 4) < 0.1);
  assert.deepEqual(await probeSize(clip), { width: 320, height: 180 });
  assert.match(await sha256(clip), /^[0-9a-f]{64}$/);
});
