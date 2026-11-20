import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CRITERIA } from "../../src/brief.mjs";
import { probeDuration, sha256 } from "../../src/ffmpeg.mjs";
import { makeClip } from "../helpers/clip.mjs";

/** A valid single-film answer that rejects the listed shot indices. */
export function singleAnswer(shots, { reject = [], reachesBar = false, mustFix = [] } = {}) {
  return {
    shots: shots.map((shot, index) => ({
      start: shot.start,
      end: shot.end,
      verdict: reject.includes(index) ? "reject" : "accept",
      sees: "a card on a warm ground",
      reason: reject.includes(index) ? "the action is too small" : "composed around the action",
    })),
    criteria: Object.fromEntries(CRITERIA.map((c) => [c, "a note"])),
    reachesBar,
    gap: reachesBar ? null : "polish",
    mustFix,
    couldNotJudge: ["easing at speed"],
  };
}

/** A valid A/B answer. Criteria not listed in `stronger` go to `closer`. */
export function abAnswer(names, { closer, margin = "clearly", stronger = {} } = {}) {
  const film = () => ({
    shots: [{ start: 0, end: 4, verdict: "accept", sees: "a card", reason: "fine" }],
    reachesBar: false,
    mustFix: [],
  });
  return {
    films: Object.fromEntries(names.map((n) => [n, film()])),
    criteria: Object.fromEntries(
      CRITERIA.map((c) => [c, { stronger: stronger[c] ?? closer, note: "a note" }]),
    ),
    closer,
    margin,
    couldNotJudge: [],
  };
}

async function filmEntry(dir, neutral, fileName) {
  const path = await makeClip(join(dir, fileName));
  return { neutral, path, sha256: await sha256(path), duration: await probeDuration(path) };
}

/**
 * Writes a packet folder as `packet` would leave it once the judges have answered:
 * a key.json pointing at real clips, and each answer as answers/judge-N.json.
 * A string answer is written exactly as given.
 */
export async function writePanelDir({ dir, shots, names, answers, round = 1, judges = 3, mode = "single" }) {
  const out = join(dir, "out");
  await mkdir(join(out, "answers"), { recursive: true });
  const films =
    mode === "ab"
      ? [await filmEntry(dir, names[0], "first source.mp4"), await filmEntry(dir, names[1], "second source.mp4")]
      : [await filmEntry(dir, "film", "film.mp4")];
  const key = {
    version: 1,
    mode,
    round,
    maxRounds: 3,
    judges,
    labels: true,
    created: "2026-11-20T00:00:00.000Z",
    films,
    shots: mode === "ab" ? null : shots,
  };
  await writeFile(join(out, "key.json"), JSON.stringify(key, null, 2));
  for (const [index, answer] of answers.entries()) {
    await writeFile(
      join(out, "answers", `judge-${index + 1}.json`),
      typeof answer === "string" ? answer : JSON.stringify(answer, null, 2),
    );
  }
  return out;
}
