import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("the manifest names the plugin", async () => {
  const m = JSON.parse(await read(".claude-plugin/plugin.json"));
  assert.equal(m.name, "tough-crowd");
  assert.equal(m.license, "Apache-2.0");
});

test("the skill has valid front matter and every step", async () => {
  const s = await read("skills/direct/SKILL.md");
  const fm = s.match(/^---\n([\s\S]+?)\n---\n/);
  assert.ok(fm);
  assert.match(fm[1], /^name: direct$/m);
  const description = fm[1].match(/^description: (.+)$/m)[1];
  assert.ok(description.startsWith("Use when") && description.length <= 1024);
  for (const word of [
    "BRIEF.md", "DIRECTION.md", "one idea", "hyperframes check", "packet", "tally", "verify",
    "unjudged", "/hyperframes",
  ]) {
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
  ]) {
    assert.ok(s.includes(phrase), phrase);
  }
});

test("the panel procedure fixes the judge prompt and the commands", async () => {
  const p = await read("skills/direct/references/panel.md");
  assert.ok(
    p.includes(
      "Write the JSON object it asks for to `<answers folder>/judge-<n>.json`, then reply with only that path.",
    ),
  );
  assert.ok(!p.includes("Save each reply"));
  for (const word of ["judge-1.json", "--round", "--ab", "three new judges"]) {
    assert.ok(p.includes(word), word);
  }
});

test("the direction reference shows the shots block", async () => {
  assert.ok(
    (await read("skills/direct/references/direction.md")).includes(
      "```shots\n0.0-2.0 | the draft",
    ),
  );
});

test("the gate closes the loopholes the review found", async () => {
  const s = await read("skills/direct/SKILL.md");
  for (const phrase of [
    "Only after the third run", "skip step 7 and `verify`", "from the film's project folder",
  ]) {
    assert.ok(s.includes(phrase), phrase);
  }
});

test("the panel procedure keeps judges blind and covers reference frames", async () => {
  const p = await read("skills/direct/references/panel.md");
  for (const phrase of [
    "Read nothing else except the images it lists", "not a fork", "--refs",
    "from the film's project folder",
  ]) {
    assert.ok(p.includes(phrase), phrase);
  }
  assert.ok((await read("skills/direct/references/direction.md")).includes("cover the whole film"));
});
