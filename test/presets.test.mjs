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
