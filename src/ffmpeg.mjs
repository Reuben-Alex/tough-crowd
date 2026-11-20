import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";

/** A problem the person can fix: bad input, a missing tool, a refusal. Exit code 2. */
export class ToolError extends Error {
  exitCode = 2;
}

const ENV_KEY = { ffmpeg: "FFMPEG_PATH", ffprobe: "FFPROBE_PATH" };

export function findTool(name, env = process.env) {
  const given = env[ENV_KEY[name]];
  if (given) {
    if (existsSync(given)) return given;
    throw new ToolError(`${ENV_KEY[name]} points to a file that does not exist: ${given}`);
  }
  const probe = spawnSync(name, ["-version"], { env, stdio: "ignore", windowsHide: true });
  if (probe.status === 0) return name;
  throw new ToolError(
    "FFmpeg not found. Install it, or set FFMPEG_PATH and FFPROBE_PATH to the executables.",
  );
}

export function run(tool, args) {
  const bin = findTool(tool);
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => reject(new ToolError(`${tool} could not start: ${e.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new ToolError(`${tool} failed: ${stderr.slice(-400).trim()}`));
    });
  });
}

export async function probeDuration(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file,
  ]);
  const seconds = Number.parseFloat(stdout);
  if (!Number.isFinite(seconds)) throw new ToolError(`Could not read a duration from ${file}`);
  return seconds;
}

export async function probeSize(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
    "-of", "csv=p=0:s=x", file,
  ]);
  const [width, height] = stdout.trim().split("x").map(Number);
  if (!width || !height) throw new ToolError(`Could not read a picture size from ${file}`);
  return { width, height };
}

export function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("error", () => reject(new ToolError(`Could not read ${file}`)))
      .on("data", (d) => hash.update(d))
      .on("end", () => resolve(hash.digest("hex")));
  });
}
