# Video Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A plugin that makes a coding agent direct a product film shot by shot on top of HyperFrames and submit it to a blind panel of three judges that can reject shots.

**Architecture:** One repository that is a Claude Code plugin and a skills-compatible package. A `direct` skill carries the directing process and staging rules; a zero-dependency Node command-line tool (`packet`, `tally`, `verify`) does the mechanical panel work with FFmpeg; judges are fresh subagents of the host harness that read only a generated brief and frame sheets. Nothing renders, captures or generates media itself: HyperFrames does that.

**Tech Stack:** Node 22+ (ESM, plain JavaScript, no build step, no runtime dependencies), `node:test`, FFmpeg/ffprobe 5.1+, HyperFrames CLI 0.9.72 (used by the skill and the examples, never imported).

**Spec:** `docs/superpowers/specs/2026-11-20-video-director-design.md`

## Global Constraints

- Name `video-director`, licence Apache-2.0.
- Node `>=22`. No runtime npm dependencies. Tests use `node --test`.
- HyperFrames CLI pinned as `hyperframes@0.9.72` wherever it is invoked.
- Works on Windows, macOS and Linux. Every path may contain spaces (the development folder is under `OneDrive\Documents`). Never build a shell string; pass arguments as arrays to `spawn`.
- Local only: no network calls, no API keys, no HeyGen sign-in, no HyperFrames Pro features.
- Ships no third-party footage, logos or fonts. Type presets use only fonts HyperFrames bundles: Inter, Montserrat, Outfit, Nunito, Oswald, League Gothic, Archivo Black, Space Mono, IBM Plex Mono, JetBrains Mono, EB Garamond, Playfair Display, Source Code Pro, Roboto, Open Sans, Lato, Poppins.
- Exit codes for the tool: `0` success, `1` the panel rejected at least one shot, `2` bad input or a refusal.
- Panel constants: 3 judges, majority rejects, at most 3 panel runs per film, contact sheets at 4 frames per second, transition strips at 12.
- Everything the tool writes into a project goes under `.director/`, except the delivered `PANEL.md`.
- Development machine note: FFmpeg is installed but may not be on `PATH` in an already-open shell. If `ffmpeg -version` fails, set `FFMPEG_PATH` and `FFPROBE_PATH` to the executables under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\`.

## Review Focus

1. FFmpeg is missing or not on `PATH`: the tool exits 2 with a message naming `FFMPEG_PATH` and `FFPROBE_PATH`, never a stack trace. (Task 1)
2. A film, brief or output path contains spaces: `packet` works unchanged. (Task 5)
3. A judge's answer is wrapped in a code fence, uses `REJECT` in capitals, or is missing a shot: fences and case are tolerated; anything else exits 2 naming the file and field. A malformed answer is never counted as an accept. (Task 6)
4. Fewer than three answers are present because a judge failed: `tally` exits 2 and decides nothing. (Task 6)
5. FFmpeg cannot draw time-stamp labels (no usable font): `packet` falls back to unlabelled sheets and the judge brief explains how to read tile times. (Task 5)

## File Structure

```
.claude-plugin/plugin.json          plugin manifest
package.json  LICENSE  README.md  .gitignore
bin/video-director.mjs              argument parsing and dispatch only
src/ffmpeg.mjs                      locate and run ffmpeg/ffprobe, probe duration, ToolError
src/direction.mjs                   read shot time ranges from DIRECTION.md
src/sheets.mjs                      contact sheets and transition strips
src/brief.mjs                       render judge-brief.md from the templates
src/packet.mjs                      the packet command
src/answers.mjs                     parse and validate one judge's answer
src/tally.mjs                       the tally command, PANEL.md, panel.json
src/verify.mjs                      the verify command
templates/judge-brief.single.md     Appendix A wording, single film
templates/judge-brief.ab.md         Appendix A wording, two films
skills/direct/SKILL.md              the directing pass and the gate
skills/direct/references/staging.md the ten staging rules
skills/direct/references/direction.md  DIRECTION.md format
skills/direct/references/panel.md   how to run the judges
skills/direct/references/stages.md  three stage presets
skills/direct/references/type.md    three type pairings
examples/stages/                    a HyperFrames project showing each preset
bench/briefs/01..05-*.md            the five test briefs
bench/PROCEDURE.md  bench/results.md
test/*.test.mjs  test/helpers/clip.mjs  test/fixtures/
```

---

### Task 1: Repository, FFmpeg access and the test clip helper

**Files:**
- Create: `package.json`, `LICENSE`, `.gitignore`, `src/ffmpeg.mjs`, `test/helpers/clip.mjs`
- Test: `test/ffmpeg.test.mjs`

**Interfaces:**
- Produces:
  - `class ToolError extends Error` with `exitCode = 2`
  - `findTool(name: 'ffmpeg' | 'ffprobe', env = process.env): string`
  - `run(tool: 'ffmpeg' | 'ffprobe', args: string[]): Promise<{ stdout: string, stderr: string }>` (rejects with `ToolError` carrying the last 400 characters of stderr)
  - `probeDuration(file: string): Promise<number>` in seconds
  - `probeSize(file: string): Promise<{ width: number, height: number }>`
  - `sha256(file: string): Promise<string>` (64 hex characters; lives in `src/ffmpeg.mjs` with the other file helpers)
  - test helper `makeClip(file: string, opts?: { seconds?: number, size?: string }): Promise<string>` (default 4 seconds, `320x180`, 30 fps, built with `-f lavfi -i testsrc2=duration=<s>:size=<size>:rate=30 -pix_fmt yuv420p`)

- [ ] **Step 1: Create the repository**

```bash
cd <repository folder>
git init -b main
git add docs && git commit -m "docs: design and plan for video-director"
git checkout -b v1
```

`package.json`: name `video-director`, version `0.1.0`, `"type": "module"`, licence `Apache-2.0`, `"engines": { "node": ">=22" }`, `"bin": { "video-director": "bin/video-director.mjs" }`, `"scripts": { "test": "node --test" }`, `"files": ["bin", "src", "templates", "skills", ".claude-plugin"]`. `LICENSE` is the Apache-2.0 text. `.gitignore`: `.director/`, `node_modules/`, `examples/**/.hyperframes/`, `examples/**/out/`.

- [ ] **Step 2: Write the failing tests**

```js
// test/ffmpeg.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findTool, probeDuration, probeSize, sha256, ToolError } from "../src/ffmpeg.mjs";
import { makeClip } from "./helpers/clip.mjs";

test("findTool explains how to fix a missing FFmpeg", () => {
  assert.throws(
    () => findTool("ffmpeg", { PATH: "" }),
    (e) => e instanceof ToolError && e.exitCode === 2 &&
      /set FFMPEG_PATH and FFPROBE_PATH/.test(e.message),
  );
});

test("findTool rejects an FFMPEG_PATH that does not exist", () => {
  assert.throws(() => findTool("ffmpeg", { FFMPEG_PATH: "/no/such/ffmpeg" }), ToolError);
});

test("probes a clip in a folder with a space", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vd probe "));
  const clip = await makeClip(join(dir, "a clip.mp4"));
  assert.ok(Math.abs((await probeDuration(clip)) - 4) < 0.1);
  assert.deepEqual(await probeSize(clip), { width: 320, height: 180 });
  assert.match(await sha256(clip), /^[0-9a-f]{64}$/);
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `node --test test/ffmpeg.test.mjs`
Expected: FAIL, cannot find module `../src/ffmpeg.mjs`.

- [ ] **Step 4: Implement `src/ffmpeg.mjs` and `test/helpers/clip.mjs`**

`findTool` returns `env.FFMPEG_PATH` / `env.FFPROBE_PATH` when set and the file exists; otherwise the bare name when `spawnSync(name, ["-version"], { env })` exits 0; otherwise throws `ToolError` with exactly: `FFmpeg not found. Install it, or set FFMPEG_PATH and FFPROBE_PATH to the executables.`

- [ ] **Step 5: Run and confirm pass**

Run: `node --test test/ffmpeg.test.mjs`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: repository scaffold and ffmpeg access"
```

---

### Task 2: Shot ranges from DIRECTION.md

**Files:**
- Create: `src/direction.mjs`
- Test: `test/direction.test.mjs`

**Interfaces:**
- Consumes: `ToolError` from Task 1.
- Produces: `parseShots(markdown: string): Shot[]` where `Shot = { start: number, end: number, name: string }`. Throws `ToolError` on any violation.

The format is one fenced block tagged `shots`, one shot a line, `start-end | name`, times in seconds:

````markdown
```shots
0.0-1.3 | the mess
1.3-4.2 | the ask
4.2-8.8 | notes become tasks
```
````

Rules: exactly one `shots` block; 1 to 12 shots; each `start < end`; each `start` is at or after the previous `end`.

- [ ] **Step 1: Write the failing tests**

```js
// test/direction.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShots } from "../src/direction.mjs";
import { ToolError } from "../src/ffmpeg.mjs";

const doc = (body) => "# Direction\n\nThe idea.\n\n```shots\n" + body + "\n```\n";

test("reads shots in order", () => {
  assert.deepEqual(parseShots(doc("0.0-1.3 | the mess\n1.3 - 4.2 | the ask")), [
    { start: 0, end: 1.3, name: "the mess" },
    { start: 1.3, end: 4.2, name: "the ask" },
  ]);
});

for (const [why, body] of [
  ["no shots block", null],
  ["overlap", "0-2 | a\n1.5-3 | b"],
  ["end before start", "2-1 | a"],
  ["unreadable line", "0 to 2, a"],
  ["empty block", ""],
]) {
  test(`rejects: ${why}`, () => {
    assert.throws(() => parseShots(body === null ? "# nothing" : doc(body)), ToolError);
  });
}

test("rejects two shots blocks", () => {
  assert.throws(() => parseShots(doc("0-1 | a") + doc("1-2 | b")), /one shots block/);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/direction.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `parseShots` in `src/direction.mjs`**

Each error message names the line number inside the block and the rule it broke.

- [ ] **Step 4: Run and confirm pass**

Run: `node --test test/direction.test.mjs`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: read shot ranges from DIRECTION.md"
```

---

### Task 3: Contact sheets and transition strips

**Files:**
- Create: `src/sheets.mjs`
- Test: `test/sheets.test.mjs`

**Interfaces:**
- Consumes: `run`, `probeDuration`, `probeSize` (Task 1); `Shot` (Task 2).
- Produces:
  - `makeSheets(opts: { film: string, outDir: string, labels?: boolean }): Promise<string[]>` returns `sheet-01.jpg`, `sheet-02.jpg`, … as absolute paths. Fixed values: 4 fps, tiles 640×360, 3 columns × 4 rows, 6 px black padding.
  - `boundaryStrips(opts: { film: string, outDir: string, shots: Shot[], duration: number, labels?: boolean }): Promise<{ at: number, path: string }[]>` writes one `strip-NN.jpg` per boundary between consecutive shots, covering `at - 0.5` to `at + 0.5` clamped to the film, at 12 fps, tiles 480×270, 6 columns.
  - `labels` defaults to `true`. With `labels: true` an FFmpeg failure is not caught here; the caller decides (Task 5).

The filter for a sheet, which the tests do not determine:

```
fps=4,scale=640:360,drawtext=text='%{pts\:hms}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65,tile=3x4:padding=6:color=black
```

Run it with `-fps_mode vfr` and an output pattern of `sheet-%02d.jpg`. With `labels: false` drop the `drawtext` stage. A strip uses `-ss <from> -t <length>` before `-i`, `fps=12`, `scale=480:270`, and `tile=6xN` where `N = ceil(frames / 6)`; its labels must show film time, so add the `from` offset: `drawtext=text='%{pts\:hms\:<from>}'`.

- [ ] **Step 1: Write the failing tests**

```js
// test/sheets.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeSheets, boundaryStrips } from "../src/sheets.mjs";
import { probeSize } from "../src/ffmpeg.mjs";
import { makeClip } from "./helpers/clip.mjs";

const setup = async () => {
  const dir = await mkdtemp(join(tmpdir(), "vd sheets "));
  return { dir, film: await makeClip(join(dir, "film.mp4"), { seconds: 4 }) };
};

test("a 4 second film gives two sheets of twelve tiles", async () => {
  const { dir, film } = await setup();
  const sheets = await makeSheets({ film, outDir: join(dir, "s") });
  assert.equal(sheets.length, 2);
  assert.match(sheets[0], /sheet-01\.jpg$/);
  assert.ok((await stat(sheets[1])).size > 1000);
  const { width, height } = await probeSize(sheets[0]);
  assert.ok(width >= 1920 && height >= 1440);
});

test("sheets can be made without labels", async () => {
  const { dir, film } = await setup();
  assert.equal((await makeSheets({ film, outDir: join(dir, "s"), labels: false })).length, 2);
});

test("one strip per boundary between shots", async () => {
  const { dir, film } = await setup();
  const shots = [
    { start: 0, end: 1.5, name: "a" },
    { start: 1.5, end: 3, name: "b" },
    { start: 3, end: 4, name: "c" },
  ];
  const strips = await boundaryStrips({ film, outDir: join(dir, "strips"), shots, duration: 4 });
  assert.deepEqual(strips.map((s) => s.at), [1.5, 3]);
  assert.ok((await stat(strips[1].path)).size > 1000);
});

test("a single shot has no strips", async () => {
  const { dir, film } = await setup();
  const strips = await boundaryStrips({
    film, outDir: join(dir, "strips"), shots: [{ start: 0, end: 4, name: "a" }], duration: 4,
  });
  assert.deepEqual(strips, []);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/sheets.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/sheets.mjs`**

- [ ] **Step 4: Run and confirm pass**

Run: `node --test test/sheets.test.mjs`
Expected: 4 tests pass. Open one sheet and one strip and confirm the time stamps read in film time.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: contact sheets and transition strips"
```

---

### Task 4: The judge brief

**Files:**
- Create: `templates/judge-brief.single.md`, `templates/judge-brief.ab.md`, `src/brief.mjs`
- Test: `test/brief.test.mjs`

**Interfaces:**
- Consumes: `Shot` (Task 2).
- Produces:
  - `CRITERIA: string[]` = `["composition", "payoff", "stage", "typography", "ui", "story", "rhythm", "ending", "slideshow"]`
  - `renderBrief(opts: { mode: 'single' | 'ab', briefText: string, silent: boolean, labels: boolean, films: { neutral: string, sheets: string[], strips: { at: number, path: string }[] }[], shots: Shot[] | null, refs: string[] }): string`

The templates carry the wording of the spec's Appendix A (role line, the bar paragraph, the limits paragraph, the five-part report) and the Appendix B table of nine questions keyed by the `CRITERIA` names. They differ from the appendix in two ways the spec requires: the report is one JSON object, and in single mode the judge is given the shot time ranges and must return one verdict for each, in order.

The answer formats the templates must show, verbatim, as the last section, headed `## Reply with only this JSON object`:

```json
{
  "shots": [{ "start": 0, "end": 1.3, "verdict": "accept or reject", "sees": "one sentence", "reason": "why" }],
  "criteria": { "composition": "", "payoff": "", "stage": "", "typography": "", "ui": "", "story": "", "rhythm": "", "ending": "", "slideshow": "" },
  "reachesBar": false,
  "gap": "polish, assets or concept; null if it reaches the bar",
  "mustFix": [{ "t": "8.75-11.0", "where": "", "problem": "", "change": "", "priority": "P0 or P1" }],
  "couldNotJudge": [""]
}
```

```json
{
  "films": {
    "<name>": {
      "shots": [{ "start": 0, "end": 1.5, "verdict": "accept or reject", "sees": "", "reason": "" }],
      "reachesBar": false,
      "mustFix": [{ "t": "", "where": "", "problem": "", "change": "", "priority": "P0 or P1" }]
    }
  },
  "criteria": { "composition": { "stronger": "<name> or none", "note": "" } },
  "closer": "<name> or none",
  "margin": "slightly, clearly or decisively; null if none",
  "couldNotJudge": [""]
}
```

In the A/B template `criteria` lists all nine keys and `films` has one entry per neutral name.

- [ ] **Step 1: Write the failing tests**

```js
// test/brief.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderBrief, CRITERIA } from "../src/brief.mjs";

const film = (neutral) => ({
  neutral, sheets: [`/p/${neutral}/sheet-01.jpg`], strips: [{ at: 1.3, path: `/p/${neutral}/strips/strip-01.jpg` }],
});
const shots = [{ start: 0, end: 1.3, name: "SECRET INTENT" }, { start: 1.3, end: 4, name: "the ask" }];
const single = (over = {}) => renderBrief({
  mode: "single", briefText: "Make a film for Tally.", silent: true, labels: true,
  films: [film("film")], shots, refs: [], ...over,
});

test("single brief carries the bar, the ranges and no author intent", () => {
  const b = single();
  assert.ok(b.includes("Merely tidy UI on a flat background is below the bar."));
  assert.ok(b.includes("Make a film for Tally."));
  assert.ok(b.includes("0-1.3") && b.includes("1.3-4"));
  assert.ok(!b.includes("SECRET INTENT") && !b.includes("the ask"));
  assert.ok(b.includes("/p/film/sheet-01.jpg") && b.includes("/p/film/strips/strip-01.jpg"));
  assert.ok(b.includes("do not mark down for missing sound"));
  for (const c of CRITERIA) assert.ok(b.includes(`"${c}"`));
  assert.ok(b.includes("## Reply with only this JSON object"));
});

test("silent line is absent when the film has sound", () => {
  assert.ok(!single({ silent: false }).includes("do not mark down for missing sound"));
});

test("unlabelled sheets explain how to read tile times", () => {
  assert.ok(single({ labels: false }).includes("((sheet - 1) × 12 + (tile - 1)) ÷ 4"));
});

test("reference frames are listed when given", () => {
  assert.ok(single({ refs: ["/p/refs/a.png"] }).includes("/p/refs/a.png"));
});

test("A/B brief names both films neutrally and asks which is closer", () => {
  const b = renderBrief({
    mode: "ab", briefText: "Make a film.", silent: true, labels: true,
    films: [{ ...film("K"), strips: [] }, { ...film("R"), strips: [] }], shots: null, refs: [],
  });
  assert.ok(b.includes("Neither film is presumed better"));
  assert.ok(b.includes('"closer"') && b.includes('"stronger"'));
  assert.ok(b.includes("Film K") && b.includes("Film R"));
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/brief.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the two templates and `renderBrief`**

Templates use `{{name}}` placeholders filled by plain string replacement. Shot ranges are printed as `start-end` with no names. The unlabelled note reads: `Tiles are not time-stamped. Read them left to right, top to bottom; a tile's time in seconds is ((sheet - 1) × 12 + (tile - 1)) ÷ 4.`

- [ ] **Step 4: Run and confirm pass**

Run: `node --test test/brief.test.mjs`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: judge brief templates"
```

---

### Task 5: The `packet` command

**Files:**
- Create: `src/packet.mjs`, `bin/video-director.mjs`
- Test: `test/packet.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1 to 4.
- Produces:
  - `packet(opts, deps?): Promise<PacketResult>`
    - `opts = { film: string, ab?: string, brief: string, direction?: string, refs?: string, out?: string, silent?: boolean, round?: number, judges?: number, seed?: number }`
    - `deps = { makeSheets, boundaryStrips }` (defaults to the real ones; the label-fallback test injects a failing `makeSheets`)
    - `PacketResult = { out: string, brief: string, answersDir: string, judges: number, labels: boolean }`
  - On disk under `out`:
    ```
    key.json
    judges/judge-brief.md
    judges/<neutral>/sheet-NN.jpg
    judges/<neutral>/strips/strip-NN.jpg     (single mode only)
    judges/refs/<copied images>
    answers/                                  (empty; the author saves judge-1.json … here)
    ```
  - `key.json = { version: 1, mode: 'single' | 'ab', round: number, maxRounds: 3, judges: number, labels: boolean, created: string, films: { neutral: string, path: string, sha256: string, duration: number }[], shots: Shot[] | null }` with absolute `path` values.
  - CLI: `video-director packet <film> --brief <file> [--direction <file>] [--ab <film>] [--refs <dir>] [--out <dir>] [--silent] [--round <n>] [--judges <n>] [--seed <n>]`, which prints the `PacketResult` as JSON on stdout. `bin/video-director.mjs` catches `ToolError`, prints its message to stderr and exits with its `exitCode`; an unknown command prints usage and exits 2.

Decisions:
- Default `out`: `.director/panel/single-r<round>` or `.director/panel/ab` under the current directory. An `out` that exists and is not empty is a `ToolError`.
- Single mode needs `--direction`; neutral name is `film`. A/B mode refuses `--direction`; the two neutral names are distinct letters drawn from `KMRTXZ`, and which film is listed first in the brief is also drawn, both from a seeded generator (`seed` for tests, otherwise random).
- `round` defaults to 1 and may not exceed 3. `judges` defaults to 3 and must be odd and at least 3.
- A shot ending more than 0.05 s after the film's duration is a `ToolError` naming the shot.
- A film longer than 30 s prints a warning on stderr and continues.
- Labels: try `labels: true`; if `makeSheets` throws, retry everything with `labels: false` and record `labels: false` in `key.json` and the brief.
- `--refs` copies `.png`, `.jpg` and `.jpeg` files only.

- [ ] **Step 1: Write the failing tests**

```js
// test/packet.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packet } from "../src/packet.mjs";
import { makeSheets, boundaryStrips } from "../src/sheets.mjs";
import { ToolError } from "../src/ffmpeg.mjs";
import { makeClip } from "./helpers/clip.mjs";

const DIRECTION = "```shots\n0-1.5 | hidden one\n1.5-4 | hidden two\n```\n";
const setup = async () => {
  const dir = await mkdtemp(join(tmpdir(), "vd packet with space "));
  const film = await makeClip(join(dir, "my film.mp4"));
  const brief = join(dir, "BRIEF.md");
  const direction = join(dir, "DIRECTION.md");
  await writeFile(brief, "Make a calm film for Tally.");
  await writeFile(direction, DIRECTION);
  return { dir, film, brief, direction };
};

test("single mode writes the packet and the key", async () => {
  const { dir, film, brief, direction } = await setup();
  const r = await packet({ film, brief, direction, out: join(dir, "out"), silent: true });
  const key = JSON.parse(await readFile(join(r.out, "key.json"), "utf8"));
  assert.equal(key.mode, "single");
  assert.equal(key.round, 1);
  assert.equal(key.maxRounds, 3);
  assert.match(key.films[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal(key.shots.length, 2);
  assert.deepEqual(await readdir(r.answersDir), []);
  assert.equal((await readdir(join(r.out, "judges", "film", "strips"))).length, 1);
  const text = await readFile(r.brief, "utf8");
  assert.ok(text.includes("Make a calm film for Tally.") && !text.includes("hidden one"));
  assert.equal(r.judges, 3);
});

test("A/B mode hides which film is which", async () => {
  const { dir, film, brief } = await setup();
  const other = await makeClip(join(dir, "stock baseline.mp4"));
  const r = await packet({ film, ab: other, brief, out: join(dir, "ab"), seed: 7 });
  const key = JSON.parse(await readFile(join(r.out, "key.json"), "utf8"));
  const names = key.films.map((f) => f.neutral);
  assert.equal(new Set(names).size, 2);
  for (const n of names) assert.match(n, /^[KMRTXZ]$/);
  const text = await readFile(r.brief, "utf8");
  assert.ok(!text.includes("my film") && !text.includes("stock baseline"));
  await assert.rejects(readdir(join(r.out, "judges", names[0], "strips")));
  const again = await packet({ film, ab: other, brief, out: join(dir, "ab2"), seed: 7 });
  const key2 = JSON.parse(await readFile(join(again.out, "key.json"), "utf8"));
  assert.deepEqual(key2.films.map((f) => f.neutral), names);
});

test("falls back to unlabelled sheets when labels cannot be drawn", async () => {
  const { dir, film, brief, direction } = await setup();
  const failing = (o) => (o.labels === false ? makeSheets(o) : Promise.reject(new ToolError("no font")));
  const r = await packet(
    { film, brief, direction, out: join(dir, "out") },
    { makeSheets: failing, boundaryStrips },
  );
  assert.equal(r.labels, false);
  assert.ok((await readFile(r.brief, "utf8")).includes("Tiles are not time-stamped"));
});

for (const [why, over] of [
  ["single mode without a direction", { direction: undefined }],
  ["a fourth round", { round: 4 }],
  ["an even number of judges", { judges: 4 }],
]) {
  test(`refuses ${why}`, async () => {
    const { dir, film, brief, direction } = await setup();
    await assert.rejects(packet({ film, brief, direction, out: join(dir, "out"), ...over }), ToolError);
  });
}

test("refuses shots that run past the end of the film", async () => {
  const { dir, film, brief } = await setup();
  const direction = join(dir, "LONG.md");
  await writeFile(direction, "```shots\n0-2 | a\n2-9 | b\n```\n");
  await assert.rejects(packet({ film, brief, direction, out: join(dir, "out") }), /2-9/);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/packet.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/packet.mjs` and `bin/video-director.mjs`**

Parse arguments with `node:util` `parseArgs`. Start the file with `#!/usr/bin/env node`.

- [ ] **Step 4: Run and confirm pass**

Run: `node --test test/packet.test.mjs`
Expected: 7 tests pass.

- [ ] **Step 5: Run the command by hand**

Run from a scratch folder holding a clip, a `BRIEF.md` and a `DIRECTION.md`: `node <repo>/bin/video-director.mjs packet clip.mp4 --brief BRIEF.md --direction DIRECTION.md`
Expected: JSON with `out`, `brief`, `answersDir`; `node <repo>/bin/video-director.mjs nonsense` exits 2 with usage.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: packet command"
```

---

### Task 6: Judge answers and `tally` for one film

**Files:**
- Create: `src/answers.mjs`, `src/tally.mjs`, `test/fixtures/answers.mjs`
- Modify: `bin/video-director.mjs` (add `tally`)
- Test: `test/tally.test.mjs`

**Interfaces:**
- Consumes: `key.json` (Task 5), `CRITERIA` (Task 4), `ToolError`, `sha256`.
- Produces:
  - `parseAnswer(text: string, key: Key, file: string): Answer` — strips a surrounding code fence, parses JSON, lower-cases every `verdict`, upper-cases every `priority`, and validates. Throws `ToolError` whose message starts with the file name and names the field.
  - `tally(out: string, opts?: { panelOut?: string }): Promise<{ exitCode: 0 | 1, panel: Panel }>`
  - Single-mode `Panel` (written to `<out>/panel.json`):
    ```
    { version: 1, mode: 'single', round, maxRounds, roundsLeft, judges,
      film: string, sha256: string,
      shots: { start, end, name, rejects: number, verdict: 'accept' | 'reject',
               votes: { judge: number, verdict: string, reason: string }[] }[],
      rejected: number[],                                  // indices into shots
      reachesBar: { yes: number, no: number, majority: boolean },
      mustFix: { shot: number | null, judge: number, priority: 'P0' | 'P1',
                 t: string, where: string, problem: string, change: string }[],
      couldNotJudge: string[] }
    ```
  - `<out>/PANEL.md`, also copied to `opts.panelOut` (CLI default `./PANEL.md`; CLI flag `--panel-out <file>`).
  - `readFooter(panelMd: string): { sha256: string, round: number, maxRounds: number, rejected: string[], reachesBar: boolean } | null`
  - CLI: `video-director tally <out> [--panel-out <file>]`, exit code from `tally`.

Decisions:
- Answers are `answers/judge-<n>.json`, `n` from 1. Fewer files than `key.judges` is a `ToolError`: `Need 3 judges' answers, found 2. Run the missing judge again; do not decide with fewer.`
- A single-mode answer must have exactly one entry per shot in `key.shots`, in order, with `start` and `end` within 0.05 s.
- A shot is rejected when `rejects > judges / 2`.
- A must-fix item belongs to the shot containing the first number in its `t`; no number, or none containing it, gives `shot: null`. Order: by shot with `null` last, `P0` before `P1`, then by judge.
- `couldNotJudge` is the de-duplicated union.
- `PANEL.md` begins with these four lines, with the numbers filled in:
  ```
  # Panel result: round 1 of 3
  **Rejected shots: 1 of 4.**
  **Reaches the bar: no** (0 of 3 judges).
  **Not judged: motion at speed, and sound.**
  ```
  then a table of shots (range, name, verdict, each judge's reason), the must-fix list grouped by shot with a count of how many judges raised something there, and the could-not-judge list. When shots are rejected and no rounds are left it adds: `No rounds left. Deliver the judged film and lead the delivery note with these rejections.`
- `PANEL.md` ends with `<!-- video-director {"sha256":"…","round":1,"maxRounds":3,"rejected":["8.8-11.6 the proof"],"reachesBar":false} -->`.

- [ ] **Step 1: Write the fixture builder**

`test/fixtures/answers.mjs` exports `singleAnswer(shots, { reject = [], reachesBar = false, mustFix = [] })`, returning a valid single-mode answer object that rejects the listed shot indices, and `writePanelDir({ dir, shots, answers, round = 1, judges = 3 })`, which writes a `key.json` (pointing at a real clip made with `makeClip`) and the given answers as `answers/judge-N.json` (a string answer is written verbatim) and returns the directory.

- [ ] **Step 2: Write the failing tests**

```js
// test/tally.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tally, readFooter } from "../src/tally.mjs";
import { ToolError } from "../src/ffmpeg.mjs";
import { singleAnswer, writePanelDir } from "./fixtures/answers.mjs";

const shots = [
  { start: 0, end: 1.5, name: "the mess" },
  { start: 1.5, end: 3, name: "the ask" },
  { start: 3, end: 4, name: "the proof" },
];
const dir = () => mkdtemp(join(tmpdir(), "vd tally "));
const run = async (answers, over = {}) => {
  const d = await dir();
  const out = await writePanelDir({ dir: d, shots, answers, ...over });
  return { out, panelOut: join(d, "PANEL.md") };
};

test("two of three judges rejecting rejects the shot", async () => {
  const { out, panelOut } = await run([
    singleAnswer(shots, { reject: [2] }), singleAnswer(shots, { reject: [2, 0] }), singleAnswer(shots),
  ]);
  const { exitCode, panel } = await tally(out, { panelOut });
  assert.equal(exitCode, 1);
  assert.deepEqual(panel.rejected, [2]);
  assert.equal(panel.shots[0].rejects, 1);
  assert.equal(panel.shots[0].verdict, "accept");
  assert.equal(panel.roundsLeft, 2);
  const md = await readFile(panelOut, "utf8");
  assert.ok(md.startsWith("# Panel result: round 1 of 3\n**Rejected shots: 1 of 3.**"));
  assert.ok(md.includes("**Not judged: motion at speed, and sound.**"));
  const footer = readFooter(md);
  assert.equal(footer.sha256, panel.sha256);
  assert.deepEqual(footer.rejected, ["3-4 the proof"]);
});

test("one rejection is not a majority", async () => {
  const { out, panelOut } = await run([
    singleAnswer(shots, { reject: [1] }), singleAnswer(shots), singleAnswer(shots),
  ]);
  assert.equal((await tally(out, { panelOut })).exitCode, 0);
});

test("the bar is reported but does not fail the film", async () => {
  const { out, panelOut } = await run([singleAnswer(shots), singleAnswer(shots), singleAnswer(shots)]);
  const { exitCode, panel } = await tally(out, { panelOut });
  assert.equal(exitCode, 0);
  assert.deepEqual(panel.reachesBar, { yes: 0, no: 3, majority: false });
  assert.ok((await readFile(panelOut, "utf8")).includes("**Reaches the bar: no** (0 of 3 judges)."));
});

test("fenced JSON and capitals are tolerated", async () => {
  const loud = singleAnswer(shots, { reject: [0] });
  loud.shots[0].verdict = "REJECT";
  const fenced = "```json\n" + JSON.stringify(loud) + "\n```";
  const { out, panelOut } = await run([fenced, fenced, singleAnswer(shots)]);
  assert.deepEqual((await tally(out, { panelOut })).panel.rejected, [0]);
});

test("a missing shot is refused, naming the file", async () => {
  const short = singleAnswer(shots);
  short.shots.pop();
  const { out, panelOut } = await run([singleAnswer(shots), short, singleAnswer(shots)]);
  await assert.rejects(tally(out, { panelOut }), (e) => e instanceof ToolError && /judge-2\.json/.test(e.message));
});

test("prose instead of JSON is refused, never counted as an accept", async () => {
  const { out, panelOut } = await run([singleAnswer(shots), "Looks great to me!", singleAnswer(shots)]);
  await assert.rejects(tally(out, { panelOut }), /judge-2\.json/);
});

test("two answers are not a panel", async () => {
  const { out, panelOut } = await run([singleAnswer(shots), singleAnswer(shots)]);
  await assert.rejects(tally(out, { panelOut }), /Need 3 judges' answers, found 2/);
});

test("must-fix items are grouped by shot with P0 first", async () => {
  const fix = (t, priority) => ({ t, where: "w", problem: "p", change: "c", priority });
  const { out, panelOut } = await run([
    singleAnswer(shots, { mustFix: [fix("3.2-3.8", "P1"), fix("0.5", "p0")] }),
    singleAnswer(shots, { mustFix: [fix("3.5", "P0"), fix("whole film", "P1")] }),
    singleAnswer(shots),
  ]);
  const { panel } = await tally(out, { panelOut });
  assert.deepEqual(panel.mustFix.map((m) => [m.shot, m.priority, m.judge]), [
    [0, "P0", 1], [2, "P0", 2], [2, "P1", 1], [null, "P1", 2],
  ]);
});

test("the last round says there are no rounds left", async () => {
  const { out, panelOut } = await run(
    [singleAnswer(shots, { reject: [0] }), singleAnswer(shots, { reject: [0] }), singleAnswer(shots)],
    { round: 3 },
  );
  await tally(out, { panelOut });
  assert.ok((await readFile(panelOut, "utf8")).includes("No rounds left."));
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `node --test test/tally.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/answers.mjs` and `src/tally.mjs`, and wire `tally` into the CLI**

- [ ] **Step 5: Run and confirm pass**

Run: `node --test test/tally.test.mjs`
Expected: 9 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: tally one film's panel"
```

---

### Task 7: `tally` for two films

**Files:**
- Modify: `src/answers.mjs`, `src/tally.mjs`, `test/fixtures/answers.mjs`
- Test: `test/tally-ab.test.mjs`

**Interfaces:**
- Consumes: Task 6.
- Produces: for a `key.json` with `mode: 'ab'`, `tally` returns `exitCode: 0` and this `Panel`:
  ```
  { version: 1, mode: 'ab', judges,
    films: { neutral: string, path: string }[],
    votes: Record<string, number>,                       // each neutral name, plus "none"
    preferred: string | null,                            // neutral name with more than half the votes
    preferredPath: string | null,
    margins: string[],                                   // from the judges who picked the preferred film
    criteria: Record<Criterion, Record<string, number>>, // per criterion: each neutral name, plus "none"
    perFilm: Record<string, { reachesBarYes: number, rejectedShots: number[] }> }  // one count per judge
  ```
  It writes `<out>/PANEL.md` only (never `./PANEL.md`), opening with `# A/B result` and either `**Preferred: <file name>** (2 of 3 judges).` or `**Not preferred: no majority.**`, then a per-criterion table using the real file names.

Validation for an A/B answer: `films` has exactly the two neutral names; `closer` and every `stronger` is one of them or `none`; all nine criteria are present.

- [ ] **Step 1: Extend the fixtures**

Add `abAnswer(names, { closer, margin = "clearly", stronger = {} })` (criteria not listed in `stronger` default to `closer`) and let `writePanelDir` take `mode: "ab"` and `names` (two neutral names, each given its own generated clip) in place of `shots`.

- [ ] **Step 2: Write the failing tests**

```js
// test/tally-ab.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { tally } from "../src/tally.mjs";
import { abAnswer, writePanelDir } from "./fixtures/answers.mjs";

const names = ["K", "R"];
const run = async (answers) => {
  const d = await mkdtemp(join(tmpdir(), "vd ab "));
  return { d, out: await writePanelDir({ dir: d, mode: "ab", names, answers }) };
};

test("two of three picks decide the preference", async () => {
  const { d, out } = await run([
    abAnswer(names, { closer: "R" }),
    abAnswer(names, { closer: "R", margin: "slightly", stronger: { ui: "K" } }),
    abAnswer(names, { closer: "K" }),
  ]);
  const { exitCode, panel } = await tally(out, { panelOut: join(d, "PANEL.md") });
  assert.equal(exitCode, 0);
  assert.equal(panel.preferred, "R");
  assert.deepEqual(panel.votes, { K: 1, R: 2, none: 0 });
  assert.deepEqual(panel.margins, ["clearly", "slightly"]);
  assert.deepEqual(panel.criteria.ui, { K: 2, R: 1, none: 0 });
  const md = await readFile(join(out, "PANEL.md"), "utf8");
  assert.ok(md.includes(`**Preferred: ${basename(panel.preferredPath)}** (2 of 3 judges).`));
  await assert.rejects(access(join(d, "PANEL.md")));
});

test("no majority means not preferred", async () => {
  const { d, out } = await run([
    abAnswer(names, { closer: "R" }), abAnswer(names, { closer: "K" }), abAnswer(names, { closer: "none", margin: null }),
  ]);
  const { panel } = await tally(out, { panelOut: join(d, "PANEL.md") });
  assert.equal(panel.preferred, null);
  assert.ok((await readFile(join(out, "PANEL.md"), "utf8")).includes("**Not preferred: no majority.**"));
});

test("a film name the packet did not issue is refused", async () => {
  const { d, out } = await run([
    abAnswer(names, { closer: "R" }), abAnswer(names, { closer: "Q" }), abAnswer(names, { closer: "R" }),
  ]);
  await assert.rejects(tally(out, { panelOut: join(d, "PANEL.md") }), /judge-2\.json.*closer/s);
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `node --test test/tally-ab.test.mjs`
Expected: FAIL (A/B keys are not handled yet).

- [ ] **Step 4: Implement the A/B branch**

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: every test passes.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: tally an A/B comparison"
```

---

### Task 8: The `verify` command

**Files:**
- Create: `src/verify.mjs`
- Modify: `bin/video-director.mjs` (add `verify`)
- Test: `test/verify.test.mjs`

**Interfaces:**
- Consumes: `readFooter` (Task 6), `sha256` (Task 1).
- Produces: `verify(film: string, opts?: { panel?: string }): Promise<{ exitCode: 0 | 2, lines: string[] }>`; CLI `video-director verify <film> [--panel <PANEL.md>]` (default `./PANEL.md`) prints the lines and exits with the code.

Exact lines:
- No file, or no footer: exit 2, `No panel result found at <path>. This film has not been judged.`
- Hash differs: exit 2, `PANEL.md is for a different file. This film was changed after it was judged: run the panel again, or deliver the judged file.`
- Hash matches: exit 0, `Judged in round <n> of <max>.`, then either `No open rejections.` or `Open rejections (the delivery note must lead with these):` followed by one `- <range and name>` line each; and when the footer's `reachesBar` is false, a last line `The panel says this film does not reach the bar. Say so in the delivery note.`

- [ ] **Step 1: Write the failing tests**

```js
// test/verify.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verify } from "../src/verify.mjs";
import { tally } from "../src/tally.mjs";
import { singleAnswer, writePanelDir } from "./fixtures/answers.mjs";

const shots = [{ start: 0, end: 2, name: "one" }, { start: 2, end: 4, name: "two" }];
const judged = async (reject) => {
  const d = await mkdtemp(join(tmpdir(), "vd verify "));
  const a = () => singleAnswer(shots, { reject });
  const out = await writePanelDir({ dir: d, shots, answers: [a(), a(), a()] });
  const panel = join(d, "PANEL.md");
  const { panel: p } = await tally(out, { panelOut: panel });
  return { film: p.film, panel };
};

test("a judged film with rejections passes and lists them", async () => {
  const { film, panel } = await judged([1]);
  const r = await verify(film, { panel });
  assert.equal(r.exitCode, 0);
  assert.deepEqual(r.lines.slice(0, 3), [
    "Judged in round 1 of 3.",
    "Open rejections (the delivery note must lead with these):",
    "- 2-4 two",
  ]);
  assert.match(r.lines.at(-1), /does not reach the bar/);
});

test("a clean film says so", async () => {
  const { film, panel } = await judged([]);
  assert.ok((await verify(film, { panel })).lines.includes("No open rejections."));
});

test("a film changed after judging is refused", async () => {
  const { film, panel } = await judged([]);
  await appendFile(film, "x");
  const r = await verify(film, { panel });
  assert.equal(r.exitCode, 2);
  assert.match(r.lines[0], /changed after it was judged/);
});

test("no panel result is refused", async () => {
  const { film } = await judged([]);
  const r = await verify(film, { panel: join(tmpdir(), "no-such-PANEL.md") });
  assert.equal(r.exitCode, 2);
  assert.match(r.lines[0], /has not been judged/);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/verify.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/verify.mjs` and wire it into the CLI**

- [ ] **Step 4: Run the whole suite**

Run: `node --test`
Expected: every test passes.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: verify command"
```

---

### Task 9: The directing skill and the plugin manifest

**Files:**
- Create: `.claude-plugin/plugin.json`, `skills/direct/SKILL.md`, `skills/direct/references/staging.md`, `skills/direct/references/direction.md`, `skills/direct/references/panel.md`
- Test: `test/skill.test.mjs`

**Interfaces:**
- Consumes: the three commands and their exit codes; the `shots` block format (Task 2).
- Produces: skill `direct` (invoked as `/video-director:direct` in Claude Code); references that Task 10 adds two files to.

Use the superpowers:writing-skills skill while writing these files. The content is fixed by the spec; what follows is what each file must say.

`.claude-plugin/plugin.json`: `{ "name": "video-director", "version": "0.1.0", "description": "Direct product films shot by shot on HyperFrames and have a blind panel of judges accept or reject each shot.", "license": "Apache-2.0" }`.

`SKILL.md` front matter: `name: direct`; `description: Use when making, remaking or reviewing a product film, launch video, promo or demo with HyperFrames, or when a HyperFrames video looks like slides, a mockup or a screen recording. Adds a directing pass before the build and a blind judging panel before delivery.`

`SKILL.md` body, in this order:
1. **Requirements.** The `/hyperframes` skill must be available; if it is not, stop and tell the person to install it with `npx hyperframes skills`. This skill never replaces it: follow `/hyperframes` for everything about how a composition is built, checked and rendered.
2. **Running the tool.** `node <SKILL_DIR>/../../bin/video-director.mjs <command>`, where `<SKILL_DIR>` is this skill's base directory.
3. **The pass**, as nine numbered steps: (0) save the person's brief, word for word, as `BRIEF.md` in the project; then the eight steps of the spec's "The pass, in order", unchanged in meaning: source, one idea, `DIRECTION.md`, stage and type, build, stock check, panel, deliver. Each step names its reference file.
4. **The gate.** The spec's panel rules that bind the author: it cannot overrule the panel; only a rejected shot forces another round; three panel runs at most; no edits after the last judged render; `verify` must pass before delivery; the delivery note leads with what `verify` prints. A harness that cannot start subagents delivers the film marked **unjudged** and says why.
5. **The delivery note**: the one idea, what was invented and what was captured, the panel result first if anything is rejected, and the line that motion at speed and sound were not judged.

`references/staging.md`: the ten staging rules from the spec, one short paragraph each: the rule, then the failure it prevents (taken from the spec's spike findings). Opens with the principle: every shot gives each object its own pose; the film never zooms around inside one fixed layout.

`references/direction.md`: the `DIRECTION.md` format. A one-sentence idea; the `shots` block exactly as in Task 2; then for each shot the seven things the spec lists (time range, action, hero and its share of the frame, what every other object is doing, where the eye goes, hold length, what causes the move into the next shot); the ending's single focal point. Includes one complete worked example for the Tally brief with five shots: the mess 0–1.3, the ask 1.3–4.2, notes become tasks 4.2–8.8, the proof 8.8–11.6, the line 11.6–15.

`references/panel.md`: the procedure, as numbered steps:
1. Render the draft. Run `packet <film> --brief BRIEF.md --direction DIRECTION.md --round <n>` (add `--silent` for a film with no sound).
2. Start three fresh subagents at the same time. Give each exactly this and nothing else: `Read the file at <brief path> and follow it exactly. Reply with only the JSON object it asks for.` No summary of the film, no intent, no earlier results.
3. Save each reply, unedited, as `judge-1.json`, `judge-2.json`, `judge-3.json` in the answers folder `packet` printed. If a judge fails, start a new one; never fill in an answer.
4. Run `tally <out>`. Exit 0: go to step 6. Exit 1: read `PANEL.md`.
5. Fix the rejected shots, and the P0 notes while there. Re-render, raise `--round`, and use three new judges. After round 3, stop.
6. Run `verify <film>`. Write the delivery note from what it prints.
Also: to compare two films, `packet <film> --ab <other> --brief BRIEF.md` then the same steps 2 to 4; an A/B result never replaces a film's own panel.

- [ ] **Step 1: Write the failing test**

```js
// test/skill.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("the manifest names the plugin", async () => {
  const m = JSON.parse(await read(".claude-plugin/plugin.json"));
  assert.equal(m.name, "video-director");
  assert.equal(m.license, "Apache-2.0");
});

test("the skill has valid front matter and every step", async () => {
  const s = await read("skills/direct/SKILL.md");
  const fm = s.match(/^---\n([\s\S]+?)\n---\n/);
  assert.ok(fm);
  assert.match(fm[1], /^name: direct$/m);
  const description = fm[1].match(/^description: (.+)$/m)[1];
  assert.ok(description.startsWith("Use when") && description.length <= 1024);
  for (const word of ["BRIEF.md", "DIRECTION.md", "one idea", "hyperframes check", "packet", "tally", "verify", "unjudged", "/hyperframes"]) {
    assert.ok(s.toLowerCase().includes(word.toLowerCase()), word);
  }
  for (const ref of ["staging.md", "direction.md", "panel.md", "stages.md", "type.md"]) {
    assert.ok(s.includes(`references/${ref}`), ref);
  }
});

test("staging carries all ten rules", async () => {
  const s = (await read("skills/direct/references/staging.md")).toLowerCase();
  for (const phrase of [
    "60%", "hero size", "1.25 seconds", "one forward progression", "one thing changes at a time",
    "blur", "80 px", "cause and effect", "no blank frame", "one focal point",
  ]) assert.ok(s.includes(phrase), phrase);
});

test("the panel procedure fixes the judge prompt and the commands", async () => {
  const p = await read("skills/direct/references/panel.md");
  assert.ok(p.includes("Reply with only the JSON object it asks for."));
  for (const word of ["judge-1.json", "--round", "--ab", "three new judges"]) assert.ok(p.includes(word), word);
});

test("the direction reference shows the shots block", async () => {
  assert.ok((await read("skills/direct/references/direction.md")).includes("```shots\n0.0-1.3 | the mess"));
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/skill.test.mjs`
Expected: FAIL, files not found.

- [ ] **Step 3: Write the manifest, `SKILL.md` and the three references**

`stages.md` and `type.md` are referenced from `SKILL.md` now and written in Task 10.

- [ ] **Step 4: Run and confirm pass**

Run: `node --test test/skill.test.mjs`
Expected: 5 tests pass.

- [ ] **Step 5: Validate the plugin**

Run: `claude plugin validate .`
Expected: the manifest and skill validate with no errors. If the installed Claude Code has no `validate` command, start `claude --plugin-dir .` and confirm `/video-director:direct` is listed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: directing skill and plugin manifest"
```

---

### Task 10: Stage and type presets

**Files:**
- Create: `skills/direct/references/stages.md`, `skills/direct/references/type.md`, `examples/stages/` (a HyperFrames project: `index.html`, `hyperframes.json`, `package.json`, `meta.json`, `compositions/warm-paper.html`, `compositions/cool-studio.html`, `compositions/night.html`)
- Test: `test/presets.test.mjs`

**Interfaces:**
- Consumes: nothing from the tool.
- Produces: three stage presets named `warm-paper`, `cool-studio`, `night`; three type pairings named `editorial`, `modern`, `poster`.

A stage preset is five layers plus a shadow recipe, each a copyable block: `ground`, `light` (under the content), `glow` (over the content), `grain`, `vignette`. The light and the glow drift slowly and linearly for the whole film, driven from the composition's timeline so the motion is a function of time. Colours are CSS variables so a brand's colours drop in.

`warm-paper` is fixed, because it is the stage the spike's judged film used:

```css
#ground   { position:absolute; inset:0; z-index:0;
            background: linear-gradient(168deg, #e0d0b9 0%, #d9c7ae 46%, #cdb898 100%); }
#light    { position:absolute; left:-200px; top:-260px; width:1700px; height:1200px; z-index:1;
            background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,246,228,.62) 0%, rgba(255,246,228,0) 100%); }
#glow     { position:absolute; left:300px; top:-200px; width:1500px; height:1100px; z-index:4; opacity:.5; pointer-events:none;
            background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,240,214,.5) 0%, rgba(255,240,214,0) 100%); }
#grain    { position:absolute; inset:0; z-index:5; opacity:.16; mix-blend-mode:multiply; pointer-events:none;
            background-size:320px 320px;
            background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.9 0'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>"); }
#vignette { position:absolute; inset:0; z-index:6; pointer-events:none;
            background: radial-gradient(ellipse 75% 75% at 50% 48%, rgba(60,40,20,0) 58%, rgba(60,40,20,.2) 100%); }
/* card shadow */
box-shadow: 0 1px 1px rgba(60,40,20,.16), 0 3px 6px rgba(60,40,20,.1), 0 14px 30px rgba(60,40,20,.1), 0 50px 110px rgba(60,40,20,.22);
/* ink #241e18 · surface #fbf7f0 · line #e3d8c8 · muted #6b5f52 */
/* drift over the film: light translate(-150px,-40px) → (130px,30px); glow translate(120px,0) → (-260px,90px) */
```

The other two follow the same structure with these values:

| | `cool-studio` | `night` |
| --- | --- | --- |
| ground | `#e6e9ec` → `#d7dce1` → `#c6cdd4` | `#1a1b1f` → `#141518` → `#0d0e10` |
| light | `rgba(255,255,255,.7)` | `rgba(120,140,175,.18)` |
| glow | `rgba(240,246,255,.45)` | `rgba(150,170,210,.12)` |
| grain | multiply, opacity `.14`, neutral grey matrix | screen, opacity `.1` |
| vignette | `rgba(20,30,40,.18)` | `rgba(0,0,0,.5)` |
| shadow tint | `rgba(20,30,45,…)` | `rgba(0,0,0,…)` at double the alphas |
| ink / surface / line / muted | `#16191c` / `#ffffff` / `#dfe3e7` / `#5b6570` | `#f2efe9` / `#222429` / `#33363d` / `#a3a7af` |

`type.md`:

| Pairing | Display (closing line, titles) | Interface | Notes, code |
| --- | --- | --- | --- |
| `editorial` | EB Garamond 500, letter-spacing −0.02em | Inter 400/600 | IBM Plex Mono 400 |
| `modern` | Outfit 600, −0.03em | Inter 400/600 | JetBrains Mono 400 |
| `poster` | Playfair Display 600, −0.01em | Lato 400/700 | Space Mono 400 |

Each pairing states where each face is used, the display size range (closing line 7% to 14% of frame height), and that one film uses one pairing.

Each example composition is a 6-second scene showing its stage with one card (title, two lines of interface text, one mono line) and the pairing that suits it (`warm-paper` with `editorial`, `cool-studio` with `modern`, `night` with `poster`), mounted back to back from `examples/stages/index.html` for 18 seconds in total. Build them by following the `/hyperframes` skill's format rules (scene inside `<template>`, one paused timeline registered under the composition id, drift driven by the timeline).

- [ ] **Step 1: Write the failing test**

```js
// test/presets.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("three stage presets, each with every layer", async () => {
  const s = await read("skills/direct/references/stages.md");
  for (const name of ["warm-paper", "cool-studio", "night"]) {
    const section = s.split(new RegExp(`^## ${name}$`, "m"))[1]?.split(/^## /m)[0];
    assert.ok(section, name);
    for (const layer of ["#ground", "#light", "#glow", "#grain", "#vignette", "box-shadow"]) {
      assert.ok(section.includes(layer), `${name} ${layer}`);
    }
  }
  assert.ok(s.includes("#d9c7ae") && s.includes("feTurbulence"));
});

test("three type pairings from bundled fonts only", async () => {
  const t = await read("skills/direct/references/type.md");
  for (const name of ["editorial", "modern", "poster"]) assert.ok(t.includes(name), name);
  for (const face of ["EB Garamond", "Inter", "IBM Plex Mono", "Outfit", "JetBrains Mono", "Playfair Display", "Lato", "Space Mono"]) {
    assert.ok(t.includes(face), face);
  }
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/presets.test.mjs`
Expected: FAIL, files not found.

- [ ] **Step 3: Write `stages.md`, `type.md` and the example project**

Scaffold the example with `npx --yes hyperframes@0.9.72 init examples/stages --example blank --non-interactive --skip-skills`, then delete the `AGENTS.md` and `CLAUDE.md` it writes.

- [ ] **Step 4: Run and confirm pass**

Run: `node --test test/presets.test.mjs`
Expected: 2 tests pass.

- [ ] **Step 5: Check the examples with HyperFrames**

Run: `cd examples/stages && npx --yes hyperframes@0.9.72 check && npx --yes hyperframes@0.9.72 snapshot --at 1,3,5,7,9,11,13,15,17`
Expected: `Check passed` with no errors and no contrast failures. Open the contact sheet: each stage shows depth (light, grain, vignette, a layered shadow), the light visibly shifts between the first and last frame of each scene, and all text is readable.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: stage and type presets"
```

---

### Task 11: The test set and the README

**Files:**
- Create: `bench/briefs/01-tally.md`, `02-ferry.md`, `03-pocketleaf.md`, `04-gauge.md`, `05-loop.md`, `bench/PROCEDURE.md`, `bench/results.md`, `README.md`
- Test: `test/bench.test.mjs`

**Interfaces:**
- Consumes: the commands and the skill.
- Produces: the procedure Task 12 follows.

The briefs. `01-tally.md` is the spec's Appendix C, word for word, including its closing paragraph. The other four use the same closing two sentences ("Warm, restrained, premium. Not a slideshow." and the fictional-product paragraph) with these openings, each for a silent 1920×1080 film:

| File | Length | Product |
| --- | --- | --- |
| `02-ferry.md` | 15 s | Ferry, a command-line tool that moves a database from one host to another with a single command. The terminal is the hero. |
| `03-pocketleaf.md` | 20 s | Pocketleaf, a phone app that names a houseplant from a photo and builds its care schedule. The phone screen is the hero. |
| `04-gauge.md` | 20 s | Gauge, a dashboard that turns an uploaded sales spreadsheet into a live chart you can ask questions of. |
| `05-loop.md` | 15 s | Loop, a laundry pickup service booked in three taps. |

`bench/PROCEDURE.md` states, as numbered steps for one brief: make two blank HyperFrames projects under `.director/bench/<nn>/stock` and `.director/bench/<nn>/plugin`; a fresh agent makes the film in `stock` with the stock HyperFrames skills only; a different fresh agent makes it in `plugin` with the stock skills plus `direct`, and the session running the test runs the panel rounds on that agent's behalf and sends each `PANEL.md` back to it; run `packet <plugin film> --ab <stock film> --brief <brief> --silent`, three judges, `tally`; record the result; give the owner both file paths for their own pick. It also states: both agents receive the brief word for word and nothing else about the other film; the pass rule (panel prefers the plugin film on at least 4 of 5 **and** the owner does on at least 4 of 5); stop as soon as two briefs are lost on either count; brief 1 is the calibration, and if the panel does not prefer the plugin film there, stop and examine the panel before running any other brief; record tokens and minutes for every agent.

`bench/results.md` is a table with one row per brief: panel preferred (file, votes), criteria won, owner preferred, plugin film's own panel (rounds used, rejections left, reaches the bar), tokens and minutes for each build and for judging, notes.

`README.md`: what the plugin is and is not (one paragraph each); requirements (Node 22+, FFmpeg, HyperFrames skills, a harness with subagents for the panel); install (`claude --plugin-dir <path>` for now); how a film gets made (the nine steps in one line each); the three commands with their exit codes; limits, stated plainly: judges see stills, so motion at speed and sound are not judged, and a judged film costs roughly 150k more tokens a round; licence.

- [ ] **Step 1: Write the failing test**

```js
// test/bench.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("five briefs, each silent, fictional and not a slideshow", async () => {
  const files = (await readdir(new URL("../bench/briefs/", import.meta.url))).sort();
  assert.deepEqual(files, ["01-tally.md", "02-ferry.md", "03-pocketleaf.md", "04-gauge.md", "05-loop.md"]);
  for (const f of files) {
    const b = await read(`bench/briefs/${f}`);
    for (const phrase of ["1920x1080", "Not a slideshow.", "fictional", "Visuals only."]) {
      assert.ok(b.includes(phrase), `${f}: ${phrase}`);
    }
  }
  assert.ok((await read("bench/briefs/01-tally.md")).includes("turns messy meeting notes into a clean task list"));
});

test("the procedure states the pass rule and the early stop", async () => {
  const p = await read("bench/PROCEDURE.md");
  for (const phrase of ["at least 4 of 5", "two briefs are lost", "calibration", "--ab", "word for word"]) {
    assert.ok(p.includes(phrase), phrase);
  }
});

test("the README states the limits", async () => {
  const r = await read("README.md");
  assert.ok(r.includes("motion at speed") && r.includes("sound") && r.includes("Apache-2.0"));
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test test/bench.test.mjs`
Expected: FAIL, files not found.

- [ ] **Step 3: Write the briefs, the procedure, the results table and the README**

- [ ] **Step 4: Run the whole suite**

Run: `node --test`
Expected: every test passes.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: test set, procedure and README"
```

---

### Task 12: Run test brief 1 end to end

**Files:**
- Modify: `bench/results.md`
- Create (not committed): `.director/bench/01/**`, `.director/upstream/**`

**Interfaces:**
- Consumes: everything. This task is the first real use of the plugin and the calibration the spec requires.

- [ ] **Step 1: Prepare**

```bash
npx --yes hyperframes@0.9.72 telemetry disable
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --sparse https://github.com/heygen-com/hyperframes.git .director/upstream
git -C .director/upstream sparse-checkout set skills
npx --yes hyperframes@0.9.72 init .director/bench/01/stock --example blank --non-interactive --skip-skills
npx --yes hyperframes@0.9.72 init .director/bench/01/plugin --example blank --non-interactive --skip-skills
```

The stock skills are read from `.director/upstream/skills/`; nothing is installed globally. Neither agent may sign in to HeyGen, publish, share, use cloud rendering, or use anything marked HyperFrames Pro.

- [ ] **Step 2: Make the stock film**

A fresh agent gets `bench/briefs/01-tally.md` word for word, the path to the stock skills, and the `stock` project. It renders `out/film.mp4`. Record its tokens and minutes.

- [ ] **Step 3: Make the plugin film**

A different fresh agent gets the same brief, the stock skills, `skills/direct/`, and the `plugin` project. It is told that the panel will be run for it and that it will receive each `PANEL.md`. Follow `skills/direct/references/panel.md` on its behalf: `packet`, three fresh judges, `tally`, send the result back, up to three runs. Finish with `verify`. Record rounds used, rejections left, tokens and minutes.

Expected: `verify` exits 0 for the delivered file, and the agent's delivery note leads with any open rejections.

- [ ] **Step 4: Judge the two films blind**

Run: `node bin/video-director.mjs packet .director/bench/01/plugin/out/film.mp4 --ab .director/bench/01/stock/out/film.mp4 --brief bench/briefs/01-tally.md --silent --out .director/bench/01/ab`, then three fresh judges and `tally .director/bench/01/ab`.

Expected: a `PANEL.md` with a preference. The spike's result on this brief was the directed film preferred "clearly".

- [ ] **Step 5: Record and stop**

Fill in row 1 of `bench/results.md`. Commit it. Report to the owner: both file paths for their own pick, the panel's preference and votes, the plugin film's own panel result, the measured cost, and anything in the tool or the skill that had to be worked around. If the panel did not prefer the plugin film, say so first and do not start brief 2. Briefs 2 to 5 run only when the owner says to.

```bash
git add bench/results.md && git commit -m "bench: brief 1 result"
```
