#!/usr/bin/env node
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { ToolError } from "../src/ffmpeg.mjs";
import { packet } from "../src/packet.mjs";
import { tally } from "../src/tally.mjs";
import { verify } from "../src/verify.mjs";

const USAGE = `Usage: tough-crowd <command>

  packet <film> --brief <file> --direction <DIRECTION.md> [--round <n>] [--silent]
      Prepare what the judges see for one film.
  packet <film> --ab <other film> --brief <file> [--silent]
      Prepare a blind comparison of two films.

  Options for packet: --refs <dir of reference frames>  --out <dir>  --judges <n>  --seed <n>

  Run every command from the film's project folder: packet writes under
  .director/ there, and tally and verify use PANEL.md there.

  tally <packet folder> [--panel-out <file>]
      Turn the judges' answers into PANEL.md. Exits 1 if a shot is rejected.

  verify <film> [--panel <PANEL.md>]
      Confirm the film is the one the panel judged, and print what the
      delivery note must lead with. Exits 2 if it is not.

Exit codes: 0 success, 1 the panel rejected a shot, 2 bad input or a refusal.`;

const number = (value) => (value === undefined ? undefined : Number(value));

const commands = {
  async packet(args) {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        brief: { type: "string" },
        direction: { type: "string" },
        ab: { type: "string" },
        refs: { type: "string" },
        out: { type: "string" },
        silent: { type: "boolean" },
        round: { type: "string" },
        judges: { type: "string" },
        seed: { type: "string" },
      },
    });
    const result = await packet({
      film: positionals[0],
      ...values,
      round: number(values.round),
      judges: number(values.judges),
      seed: number(values.seed),
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  },

  async tally(args) {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: { "panel-out": { type: "string" } },
    });
    if (!positionals[0]) throw new ToolError("tally needs the folder packet created.");
    const out = resolve(positionals[0]);
    const panelOut = resolve(values["panel-out"] ?? "PANEL.md");
    const { exitCode, markdown, delivered } = await tally(out, { panelOut });
    console.log(markdown.split("\n").slice(0, 4).join("\n").replaceAll("*", ""));
    console.log(`\nFull result: ${join(out, "PANEL.md")}`);
    if (delivered) console.log(`Delivered copy: ${delivered}`);
    return exitCode;
  },

  async verify(args) {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: { panel: { type: "string" } },
    });
    const { exitCode, lines } = await verify(positionals[0], {
      panel: resolve(values.panel ?? "PANEL.md"),
    });
    (exitCode === 0 ? console.log : console.error)(lines.join("\n"));
    return exitCode;
  },
};

async function main([name, ...args]) {
  const command = Object.hasOwn(commands, name ?? "") ? commands[name] : null;
  if (!command) {
    console.error(USAGE);
    return 2;
  }
  try {
    return await command(args);
  } catch (error) {
    if (error instanceof ToolError) {
      console.error(error.message);
      return error.exitCode;
    }
    if (String(error.code).startsWith("ERR_PARSE_ARGS")) {
      console.error(`${error.message}\n\n${USAGE}`);
      return 2;
    }
    // Never exit 1 by accident: 1 means the panel rejected a shot.
    console.error(`Unexpected error: ${error.message}`);
    return 2;
  }
}

process.exitCode = await main(process.argv.slice(2));
