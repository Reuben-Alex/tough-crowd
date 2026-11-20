import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { renderBrief } from "./brief.mjs";
import { parseShots } from "./direction.mjs";
import { probeDuration, sha256, ToolError } from "./ffmpeg.mjs";
import { boundaryStrips, makeSheets } from "./sheets.mjs";

export const MAX_ROUNDS = 3;
const NEUTRAL_LETTERS = "KMRTXZ";
const REF_TYPES = new Set([".png", ".jpg", ".jpeg"]);
const LONG_FILM_SECONDS = 30;
const SHOT_END_SLACK = 0.05;
const COVER_SLACK = 0.1;

/** Small seeded generator, so a test can pin the neutral names. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function mustExist(path, what) {
  if (!path || !existsSync(path)) throw new ToolError(`${what} not found: ${path}`);
  return resolve(path);
}

/** What part of the film no shot covers, or null. An uncovered stretch would go unjudged. */
function uncovered(shots, duration) {
  if (shots[0].start > COVER_SLACK) return `the first shot starts at ${shots[0].start}, not at 0`;
  for (let i = 1; i < shots.length; i += 1) {
    if (shots[i].start - shots[i - 1].end > COVER_SLACK) {
      return `nothing covers ${shots[i - 1].end}-${shots[i].start}`;
    }
  }
  const last = shots.at(-1);
  if (duration - last.end > COVER_SLACK) {
    return `the last shot ends at ${last.end} but the film runs to ${duration.toFixed(2)}`;
  }
  return null;
}

function validate({ film, ab, brief, direction, round, judges }) {
  if (!film) throw new ToolError("packet needs a film to judge.");
  if (!brief) throw new ToolError("packet needs --brief <file>: the brief the film was made from.");
  if (!Number.isInteger(round) || round < 1 || round > MAX_ROUNDS) {
    throw new ToolError(
      `Round ${round} is not allowed: a film gets at most ${MAX_ROUNDS} panel runs.`,
    );
  }
  if (!Number.isInteger(judges) || judges < 3 || judges % 2 === 0) {
    throw new ToolError("The panel needs an odd number of judges, 3 or more.");
  }
  if (!ab && !direction) {
    throw new ToolError(
      "A single film needs --direction <DIRECTION.md>, so the judges can be given the shot time ranges.",
    );
  }
  if (ab && direction) {
    throw new ToolError("A/B mode takes no --direction: both films must get identical packets.");
  }
}

/**
 * Prepares everything the judges see for one film, or for two films to compare blind.
 * Judges are given `judges/`; `key.json` stays with the author.
 */
export async function packet(opts, deps = { makeSheets, boundaryStrips }) {
  const { silent = false, round = 1, judges = 3 } = opts;
  validate({ ...opts, round, judges });
  const mode = opts.ab ? "ab" : "single";

  const paths = [mustExist(opts.film, "Film")];
  if (opts.ab) paths.push(mustExist(opts.ab, "Second film"));
  const briefText = await readFile(mustExist(opts.brief, "Brief"), "utf8");
  const shots =
    mode === "single"
      ? parseShots(await readFile(mustExist(opts.direction, "Direction file"), "utf8"))
      : null;
  const refsDir = opts.refs ? mustExist(opts.refs, "Reference folder") : null;

  const out = resolve(
    opts.out ?? join(".director", "panel", mode === "ab" ? "ab" : `single-r${round}`),
  );
  if (existsSync(out) && (await readdir(out)).length > 0) {
    throw new ToolError(`${out} already exists. Delete it, or choose another folder with --out.`);
  }

  const random = opts.seed === undefined ? Math.random : seeded(opts.seed);
  const names =
    mode === "single" ? ["film"] : shuffled([...NEUTRAL_LETTERS], random).slice(0, 2);
  const order = mode === "single" ? paths : shuffled(paths, random);

  const films = [];
  for (const [index, path] of order.entries()) {
    const duration = await probeDuration(path);
    if (duration > LONG_FILM_SECONDS) {
      console.warn(
        `${basename(path)} is ${duration.toFixed(1)} s long. The panel is tuned for films up to ${LONG_FILM_SECONDS} s.`,
      );
    }
    films.push({ neutral: names[index], path, sha256: await sha256(path), duration });
  }
  if (shots) {
    const late = shots.find((s) => s.end > films[0].duration + SHOT_END_SLACK);
    if (late) {
      throw new ToolError(
        `Shot ${late.start}-${late.end} runs past the end of the film (${films[0].duration.toFixed(2)} s).`,
      );
    }
    const gap = uncovered(shots, films[0].duration);
    if (gap) {
      throw new ToolError(
        `The shots in the direction file must cover the whole film: ${gap}. Update it to match the render.`,
      );
    }
  }

  const judgesDir = join(out, "judges");
  const answersDir = join(out, "answers");
  await mkdir(answersDir, { recursive: true });

  const build = async (labels) => {
    const seen = [];
    for (const film of films) {
      const dir = join(judgesDir, film.neutral);
      const sheets = await deps.makeSheets({ film: film.path, outDir: dir, labels });
      const strips = shots
        ? await deps.boundaryStrips({
            film: film.path,
            outDir: join(dir, "strips"),
            shots,
            duration: film.duration,
            labels,
          })
        : [];
      seen.push({ neutral: film.neutral, sheets, strips });
    }
    return seen;
  };

  let labels = true;
  let seen;
  try {
    seen = await build(true);
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    // No usable font for time stamps: judges get plain tiles and a rule for reading times.
    await rm(judgesDir, { recursive: true, force: true });
    labels = false;
    seen = await build(false);
  }

  const refs = [];
  if (refsDir) {
    const target = join(judgesDir, "refs");
    await mkdir(target, { recursive: true });
    for (const name of (await readdir(refsDir)).sort()) {
      if (!REF_TYPES.has(extname(name).toLowerCase())) continue;
      await copyFile(join(refsDir, name), join(target, name));
      refs.push(resolve(target, name));
    }
  }

  const brief = join(judgesDir, "judge-brief.md");
  await writeFile(
    brief,
    renderBrief({ mode, briefText, silent, labels, films: seen, shots, refs }),
  );
  const key = {
    version: 1,
    mode,
    round,
    maxRounds: MAX_ROUNDS,
    judges,
    labels,
    created: new Date().toISOString(),
    films,
    shots,
  };
  await writeFile(join(out, "key.json"), JSON.stringify(key, null, 2) + "\n");

  return { out, brief, answersDir, judges, labels };
}
