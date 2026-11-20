import { CRITERIA } from "./brief.mjs";
import { ToolError } from "./ffmpeg.mjs";

const RANGE_SLACK = 0.05;
const FENCE = /^\s*```[a-zA-Z]*\s*\r?\n([\s\S]*?)\r?\n```\s*$/;

const text = (value) => (value === undefined || value === null ? "" : String(value));

function shotVerdicts(list, file, where) {
  if (!Array.isArray(list)) throw new ToolError(`${file}: ${where}: expected a list of shots`);
  return list.map((shot, index) => {
    const at = `${where}[${index}]`;
    const verdict = text(shot?.verdict).toLowerCase();
    if (verdict !== "accept" && verdict !== "reject") {
      throw new ToolError(`${file}: ${at}.verdict: expected accept or reject, got "${shot?.verdict}"`);
    }
    const start = Number(shot.start);
    const end = Number(shot.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new ToolError(`${file}: ${at}: start and end must be numbers of seconds`);
    }
    return { start, end, verdict, sees: text(shot.sees), reason: text(shot.reason) };
  });
}

function mustFixList(list, file, where) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) throw new ToolError(`${file}: ${where}: expected a list`);
  return list.map((item, index) => {
    const priority = text(item?.priority).toUpperCase();
    if (priority !== "P0" && priority !== "P1") {
      throw new ToolError(
        `${file}: ${where}[${index}].priority: expected P0 or P1, got "${item?.priority}"`,
      );
    }
    return {
      t: text(item.t),
      where: text(item.where),
      problem: text(item.problem),
      change: text(item.change),
      priority,
    };
  });
}

function singleAnswer(raw, key, file) {
  const shots = shotVerdicts(raw.shots, file, "shots");
  if (shots.length !== key.shots.length) {
    throw new ToolError(
      `${file}: shots: expected ${key.shots.length} verdicts, one per shot, found ${shots.length}`,
    );
  }
  shots.forEach((shot, index) => {
    const want = key.shots[index];
    if (
      Math.abs(shot.start - want.start) > RANGE_SLACK ||
      Math.abs(shot.end - want.end) > RANGE_SLACK
    ) {
      throw new ToolError(
        `${file}: shots[${index}]: range ${shot.start}-${shot.end} does not match shot ${want.start}-${want.end}`,
      );
    }
  });
  const criteria = {};
  for (const name of CRITERIA) {
    if (typeof raw.criteria?.[name] !== "string") {
      throw new ToolError(`${file}: criteria.${name}: expected a note`);
    }
    criteria[name] = raw.criteria[name];
  }
  if (typeof raw.reachesBar !== "boolean") {
    throw new ToolError(`${file}: reachesBar: expected true or false`);
  }
  return {
    shots,
    criteria,
    reachesBar: raw.reachesBar,
    gap: raw.gap ?? null,
    mustFix: mustFixList(raw.mustFix, file, "mustFix"),
    couldNotJudge: Array.isArray(raw.couldNotJudge) ? raw.couldNotJudge.map(text) : [],
  };
}

/**
 * Reads one judge's reply. A surrounding code fence and the case of verdicts and
 * priorities are forgiven; anything else that does not fit is refused by name.
 */
export function parseAnswer(reply, key, file) {
  const fenced = reply.match(FENCE);
  let raw;
  try {
    raw = JSON.parse(fenced ? fenced[1] : reply);
  } catch {
    raw = null;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ToolError(
      `${file}: not a JSON object. A judge must reply with only the JSON object; run this judge again.`,
    );
  }
  return singleAnswer(raw, key, file);
}
