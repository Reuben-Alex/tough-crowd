#!/usr/bin/env node
import { parseArgs } from "node:util";
import { ToolError } from "../src/ffmpeg.mjs";
import { packet } from "../src/packet.mjs";

const USAGE = `Usage: video-director <command>

  packet <film> --brief <file> --direction <DIRECTION.md> [--round <n>] [--silent]
      Prepare what the judges see for one film.
  packet <film> --ab <other film> --brief <file> [--silent]
      Prepare a blind comparison of two films.

  Options for packet: --refs <dir>  --out <dir>  --judges <n>  --seed <n>

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
};

async function main([name, ...args]) {
  const command = commands[name];
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
    throw error;
  }
}

process.exitCode = await main(process.argv.slice(2));
