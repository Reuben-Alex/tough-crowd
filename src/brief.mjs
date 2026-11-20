import { readFileSync } from "node:fs";

export const CRITERIA = [
  "composition",
  "payoff",
  "stage",
  "typography",
  "ui",
  "story",
  "rhythm",
  "ending",
  "slideshow",
];

const QUESTIONS = {
  composition:
    "Is each frame composed around its action, without awkward crops, tangents or dead areas?",
  payoff: "Does the key moment play large and legible?",
  stage: "Is there depth, light and texture, so it reads as designed and not as a mockup?",
  typography: "Does the type have a voice and a clear hierarchy?",
  ui: "Does it read as a real product?",
  story: "Would a stranger get the product's claim from the pictures alone?",
  rhythm:
    "As far as stills show: contrast in pacing, earned holds, no dead stretches, few things moving at once.",
  ending: "Does it land on one focal point, with the brand readable?",
  slideshow: "Does any part read as slides?",
};

const SILENT = "The film is silent on purpose; do not mark down for missing sound.";
const LABELLED =
  "Each tile is time-stamped in its top-left corner. The label covers a little of the picture; ignore it.";
const UNLABELLED =
  "Tiles are not time-stamped. Read them left to right, top to bottom; a tile's time in seconds is ((sheet - 1) × 12 + (tile - 1)) ÷ 4. A strip runs from half a second before its time to half a second after.";

const template = (mode) =>
  readFileSync(new URL(`../templates/judge-brief.${mode}.md`, import.meta.url), "utf8");

const list = (items) => items.map((item) => `- ${item}`).join("\n");

function imagesFor(film, heading) {
  const parts = [];
  if (heading) parts.push(`### Film ${film.neutral}`);
  parts.push(list(film.sheets));
  if (film.strips.length) {
    parts.push("Denser strips, 12 frames per second, across each change of shot:");
    parts.push(list(film.strips.map((s) => `at ${s.at} s: ${s.path}`)));
  }
  return parts.join("\n\n");
}

function abAnswer(names) {
  const shot = { start: 0, end: 1.5, verdict: "accept or reject", sees: "", reason: "" };
  const fix = { t: "", where: "", problem: "", change: "", priority: "P0 or P1" };
  const either = `${names.join(" or ")} or none`;
  return JSON.stringify(
    {
      films: Object.fromEntries(
        names.map((n) => [n, { shots: [shot], reachesBar: false, mustFix: [fix] }]),
      ),
      criteria: Object.fromEntries(CRITERIA.map((c) => [c, { stronger: either, note: "" }])),
      closer: either,
      margin: "slightly, clearly or decisively; null if none",
      couldNotJudge: [""],
    },
    null,
    2,
  );
}

/** The only text a judge is given. It carries no author intent and no real file names. */
export function renderBrief({ mode, briefText, silent, labels, films, shots, refs }) {
  const ab = mode === "ab";
  const values = {
    brief: briefText.trim(),
    silent: silent ? SILENT : "",
    labels: labels ? LABELLED : UNLABELLED,
    images: films.map((film) => imagesFor(film, ab)).join("\n\n"),
    refs: refs.length
      ? "Reference frames the film's owner supplied as examples of the bar:\n\n" + list(refs)
      : "",
    shots: shots ? list(shots.map((s) => `${s.start}-${s.end}`)) : "",
    criteria:
      "| Key | The question |\n| --- | --- |\n" +
      CRITERIA.map((c) => `| \`${c}\` | ${QUESTIONS[c]} |`).join("\n"),
    answer: ab ? abAnswer(films.map((f) => f.neutral)) : "",
  };
  return template(mode)
    .replace(/\{\{(\w+)\}\}/g, (_, key) => values[key])
    .replace(/\n{3,}/g, "\n\n");
}
