import { ToolError } from "./ffmpeg.mjs";

const BLOCK = /^```shots[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;
const LINE = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*\|\s*(.+)$/;
const MAX_SHOTS = 12;

/**
 * Reads the shot time ranges from a DIRECTION.md: one fenced block tagged
 * `shots`, one `start-end | name` line per shot, times in seconds.
 */
export function parseShots(markdown) {
  const blocks = [...markdown.matchAll(BLOCK)];
  if (blocks.length !== 1) {
    throw new ToolError(
      `DIRECTION.md needs exactly one shots block, found ${blocks.length}. ` +
        "Write the shots as a fenced block tagged `shots`, one `start-end | name` line per shot.",
    );
  }
  const shots = [];
  blocks[0][1].split(/\r?\n/).forEach((raw, index) => {
    const text = raw.trim();
    if (!text) return;
    const where = `shots block line ${index + 1}`;
    const m = text.match(LINE);
    if (!m) throw new ToolError(`${where}: expected "start-end | name", got "${text}"`);
    const shot = { start: Number(m[1]), end: Number(m[2]), name: m[3].trim() };
    if (shot.start >= shot.end) {
      throw new ToolError(`${where}: a shot must end after it starts (${m[1]}-${m[2]})`);
    }
    const previous = shots.at(-1);
    if (previous && shot.start < previous.end) {
      throw new ToolError(
        `${where}: starts at ${m[1]}, before the previous shot ends at ${previous.end}`,
      );
    }
    shots.push(shot);
  });
  if (shots.length < 1 || shots.length > MAX_SHOTS) {
    throw new ToolError(`The shots block must list 1 to ${MAX_SHOTS} shots, found ${shots.length}`);
  }
  return shots;
}
