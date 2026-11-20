import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseAnswer } from "./answers.mjs";
import { ToolError } from "./ffmpeg.mjs";

const FOOTER = /<!-- video-director (\{.*\}) -->\s*$/;
const NOT_JUDGED = "**Not judged: motion at speed, and sound.**";

const shotLabel = (shot) => `${shot.start}-${shot.end} ${shot.name}`;
const cell = (value) => value.replaceAll("|", "\\|").replace(/\s*\r?\n\s*/g, " ");

/** The machine-readable line `tally` leaves at the end of PANEL.md, or null. */
export function readFooter(panelMd) {
  const m = panelMd.match(FOOTER);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

async function readKey(out) {
  const path = join(out, "key.json");
  if (!existsSync(path)) throw new ToolError(`No key.json in ${out}. Run packet first.`);
  return JSON.parse(await readFile(path, "utf8"));
}

async function readAnswers(out, key) {
  const dir = join(out, "answers");
  const files = existsSync(dir)
    ? (await readdir(dir))
        .map((name) => ({ name, judge: Number(name.match(/^judge-(\d+)\.json$/)?.[1]) }))
        .filter((f) => Number.isInteger(f.judge))
        .sort((a, b) => a.judge - b.judge)
    : [];
  if (files.length < key.judges) {
    throw new ToolError(
      `Need ${key.judges} judges' answers, found ${files.length}. Run the missing judge again; do not decide with fewer.`,
    );
  }
  if (files.length > key.judges) {
    throw new ToolError(
      `Expected ${key.judges} judges' answers, found ${files.length}. Remove the extra files from ${dir}.`,
    );
  }
  const answers = [];
  for (const { name, judge } of files) {
    const reply = await readFile(join(dir, name), "utf8");
    answers.push({ judge, ...parseAnswer(reply, key, name) });
  }
  return answers;
}

/** Which shot a must-fix note belongs to: the one containing the first time it names. */
function shotOf(t, shots) {
  const first = t.match(/\d+(?:\.\d+)?/);
  if (!first) return null;
  const at = Number(first[0]);
  const index = shots.findIndex(
    (shot, i) => at >= shot.start && (at < shot.end || (i === shots.length - 1 && at <= shot.end)),
  );
  return index === -1 ? null : index;
}

function tallySingle(key, answers) {
  const shots = key.shots.map((shot, index) => {
    const votes = answers.map((a) => ({
      judge: a.judge,
      verdict: a.shots[index].verdict,
      reason: a.shots[index].reason,
    }));
    const rejects = votes.filter((v) => v.verdict === "reject").length;
    return { ...shot, rejects, verdict: rejects > key.judges / 2 ? "reject" : "accept", votes };
  });
  const yes = answers.filter((a) => a.reachesBar).length;
  const last = Number.MAX_SAFE_INTEGER;
  const mustFix = answers
    .flatMap((a) => a.mustFix.map((m) => ({ shot: shotOf(m.t, key.shots), judge: a.judge, ...m })))
    .sort(
      (a, b) =>
        (a.shot ?? last) - (b.shot ?? last) ||
        a.priority.localeCompare(b.priority) ||
        a.judge - b.judge,
    );
  return {
    version: 1,
    mode: "single",
    round: key.round,
    maxRounds: key.maxRounds,
    roundsLeft: key.maxRounds - key.round,
    judges: key.judges,
    film: key.films[0].path,
    sha256: key.films[0].sha256,
    shots,
    rejected: shots.flatMap((shot, index) => (shot.verdict === "reject" ? [index] : [])),
    reachesBar: { yes, no: answers.length - yes, majority: yes > key.judges / 2 },
    mustFix,
    couldNotJudge: [...new Set(answers.flatMap((a) => a.couldNotJudge).map((s) => s.trim()))].filter(
      Boolean,
    ),
  };
}

function renderSingle(panel) {
  const { shots, rejected, judges, reachesBar } = panel;
  const lines = [
    `# Panel result: round ${panel.round} of ${panel.maxRounds}`,
    `**Rejected shots: ${rejected.length} of ${shots.length}.**  `,
    `**Reaches the bar: ${reachesBar.majority ? "yes" : "no"}** (${reachesBar.yes} of ${judges} judges).  `,
    NOT_JUDGED,
    "",
    `Film: \`${basename(panel.film)}\``,
    "",
  ];
  if (rejected.length && panel.roundsLeft > 0) {
    lines.push(
      `Fix the rejected shots, render again, and run round ${panel.round + 1} with new judges.`,
      "",
    );
  }
  if (rejected.length && panel.roundsLeft === 0) {
    lines.push(
      "No rounds left. Deliver the judged film and lead the delivery note with these rejections.",
      "",
    );
  }

  lines.push("## Shots", "", "| Shot | Verdict | What each judge said |", "| --- | --- | --- |");
  for (const shot of shots) {
    const said = shot.votes.map((v) => `${v.judge}: ${v.verdict}. ${cell(v.reason)}`).join("<br>");
    const verdict = `**${shot.verdict}** (${shot.rejects} of ${judges} reject)`;
    lines.push(`| ${cell(shotLabel(shot))} | ${verdict} | ${said} |`);
  }

  if (panel.mustFix.length) {
    lines.push("", "## Must fix");
    const groups = [...new Set(panel.mustFix.map((m) => m.shot))];
    for (const group of groups) {
      const items = panel.mustFix.filter((m) => m.shot === group);
      const raisedBy = new Set(items.map((m) => m.judge)).size;
      const title = group === null ? "Whole film" : shotLabel(shots[group]);
      lines.push("", `### ${title} (raised by ${raisedBy} of ${judges} judges)`, "");
      for (const m of items) {
        lines.push(
          `- **${m.priority}** t=${m.t} · ${m.where} · ${m.problem} → ${m.change} (judge ${m.judge})`,
        );
      }
    }
  }

  if (panel.couldNotJudge.length) {
    lines.push("", "## What the judges could not judge", "");
    for (const item of panel.couldNotJudge) lines.push(`- ${item}`);
  }

  const footer = {
    sha256: panel.sha256,
    round: panel.round,
    maxRounds: panel.maxRounds,
    rejected: rejected.map((index) => shotLabel(shots[index])),
    reachesBar: reachesBar.majority,
  };
  lines.push("", `<!-- video-director ${JSON.stringify(footer)} -->`, "");
  return lines.join("\n");
}

function tallyAb(key, answers) {
  const names = key.films.map((film) => film.neutral);
  const count = (picks) =>
    Object.fromEntries([...names, "none"].map((n) => [n, picks.filter((p) => p === n).length]));
  const votes = count(answers.map((a) => a.closer));
  const preferred = names.find((n) => votes[n] > key.judges / 2) ?? null;
  return {
    version: 1,
    mode: "ab",
    judges: key.judges,
    films: key.films.map(({ neutral, path }) => ({ neutral, path })),
    votes,
    preferred,
    preferredPath: preferred ? key.films.find((f) => f.neutral === preferred).path : null,
    margins: answers.filter((a) => preferred && a.closer === preferred).map((a) => a.margin),
    criteria: Object.fromEntries(
      Object.keys(answers[0].criteria).map((c) => [c, count(answers.map((a) => a.criteria[c].stronger))]),
    ),
    perFilm: Object.fromEntries(
      names.map((n) => [
        n,
        {
          reachesBarYes: answers.filter((a) => a.films[n].reachesBar).length,
          rejectedShots: answers.map(
            (a) => a.films[n].shots.filter((s) => s.verdict === "reject").length,
          ),
        },
      ]),
    ),
    couldNotJudge: [...new Set(answers.flatMap((a) => a.couldNotJudge).map((s) => s.trim()))].filter(
      Boolean,
    ),
  };
}

function renderAb(panel) {
  const { films, judges, votes } = panel;
  const names = films.map((film) => film.neutral);
  const lines = ["# A/B result"];
  if (panel.preferred) {
    lines.push(
      `**Preferred: ${basename(panel.preferredPath)}** (${votes[panel.preferred]} of ${judges} judges).  `,
      `Path: \`${panel.preferredPath}\`  `,
      `By how much, in those judges' words: ${panel.margins.filter(Boolean).join(", ") || "not stated"}.  `,
    );
  } else {
    lines.push("**Not preferred: no majority.**  ");
  }
  lines.push(NOT_JUDGED, "", "The judges saw the films under these names, and did not know which was which:", "");
  for (const film of films) lines.push(`- ${film.neutral}: \`${film.path}\``);
  lines.push("", "## Votes for the film closer to the bar", "");
  for (const name of [...names, "none"]) lines.push(`- ${name}: ${votes[name]}`);
  lines.push("", "## Stronger film on each criterion", "");
  lines.push(`| Criterion | ${names.join(" | ")} | none |`, `| --- | ${names.map(() => "---").join(" | ")} | --- |`);
  for (const [criterion, counts] of Object.entries(panel.criteria)) {
    lines.push(`| ${criterion} | ${names.map((n) => counts[n]).join(" | ")} | ${counts.none} |`);
  }
  lines.push("", "## Each film on its own", "");
  for (const name of names) {
    const own = panel.perFilm[name];
    lines.push(
      `- ${name}: reaches the bar according to ${own.reachesBarYes} of ${judges} judges; shots rejected by each judge: ${own.rejectedShots.join(", ")}`,
    );
  }
  if (panel.couldNotJudge.length) {
    lines.push("", "## What the judges could not judge", "");
    for (const item of panel.couldNotJudge) lines.push(`- ${item}`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Turns the judges' answers into a result. A shot is rejected when more than half
 * the judges reject it; only that makes the exit code 1. A comparison of two films
 * always exits 0 and never writes the delivered PANEL.md.
 */
export async function tally(out, { panelOut } = {}) {
  const key = await readKey(out);
  const answers = await readAnswers(out, key);
  if (key.mode === "ab") {
    const panel = tallyAb(key, answers);
    const md = renderAb(panel);
    await writeFile(join(out, "panel.json"), JSON.stringify(panel, null, 2) + "\n");
    await writeFile(join(out, "PANEL.md"), md);
    return { exitCode: 0, panel, markdown: md };
  }
  const panel = tallySingle(key, answers);
  const md = renderSingle(panel);
  await writeFile(join(out, "panel.json"), JSON.stringify(panel, null, 2) + "\n");
  await writeFile(join(out, "PANEL.md"), md);
  if (panelOut) await writeFile(panelOut, md);
  return { exitCode: panel.rejected.length ? 1 : 0, panel, markdown: md };
}
