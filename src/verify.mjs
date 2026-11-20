import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { sha256, ToolError } from "./ffmpeg.mjs";
import { readFooter } from "./tally.mjs";

/**
 * The last check before delivery: the file being delivered must be the one the panel
 * judged. Prints what the delivery note has to lead with.
 */
export async function verify(film, { panel = "PANEL.md" } = {}) {
  if (!film || !existsSync(film)) throw new ToolError(`Film not found: ${film}`);
  const footer = existsSync(panel) ? readFooter(await readFile(panel, "utf8")) : null;
  if (!footer) {
    return {
      exitCode: 2,
      lines: [`No panel result found at ${panel}. This film has not been judged.`],
    };
  }
  if (footer.sha256 !== (await sha256(film))) {
    return {
      exitCode: 2,
      lines: [
        "PANEL.md is for a different file. This film was changed after it was judged: run the panel again, or deliver the judged file.",
      ],
    };
  }
  const lines = [`Judged in round ${footer.round} of ${footer.maxRounds}.`];
  if (footer.rejected.length) {
    lines.push("Open rejections (the delivery note must lead with these):");
    for (const shot of footer.rejected) lines.push(`- ${shot}`);
  } else {
    lines.push("No open rejections.");
  }
  if (!footer.reachesBar) {
    lines.push("The panel says this film does not reach the bar. Say so in the delivery note.");
  }
  return { exitCode: 0, lines };
}
