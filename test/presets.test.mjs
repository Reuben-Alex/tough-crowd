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
  for (const face of [
    "EB Garamond", "Inter", "IBM Plex Mono", "Outfit", "JetBrains Mono", "Playfair Display",
    "Lato", "Space Mono",
  ]) {
    assert.ok(t.includes(face), face);
  }
});

test("the example project cannot publish anywhere", async () => {
  const pkg = JSON.parse(await read("examples/stages/package.json"));
  assert.equal(pkg.scripts.publish, undefined);
});

test("the stage reference and the examples match their generator", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtemp } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const out = await mkdtemp(join(tmpdir(), "vd presets "));
  const script = fileURLToPath(new URL("../scripts/generate-stage-presets.mjs", import.meta.url));
  const r = spawnSync(process.execPath, [script, out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  for (const file of [
    "skills/direct/references/stages.md",
    "examples/stages/index.html",
    "examples/stages/compositions/warm-paper.html",
    "examples/stages/compositions/cool-studio.html",
    "examples/stages/compositions/night.html",
  ]) {
    assert.equal(await readFile(join(out, file), "utf8"), await read(file), file);
  }
});
