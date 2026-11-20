# The test: does the plugin beat stock HyperFrames?

Five briefs, two films each: one made with the stock HyperFrames skills, one made with the
stock skills plus this plugin's `direct` skill. A blind panel and the project's owner each say
which film of every pair is closer to the bar.

## The rule

The project continues only if both hold:

- the panel prefers the plugin film on at least 4 of 5 briefs, and
- the owner prefers the plugin film by eye on at least 4 of 5.

Stop as soon as two briefs are lost on either count: 4 of 5 is then out of reach.

Brief 1 is the calibration. It is the brief the first spike used, where a hand-directed film was
preferred "clearly". If the panel does not prefer the plugin film on brief 1, stop and examine
the panel and the skill before running any other brief.

## Setup, once

```
npx --yes hyperframes@0.9.72 telemetry disable
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --sparse https://github.com/heygen-com/hyperframes.git .director/upstream
git -C .director/upstream sparse-checkout set skills
```

The stock skills are read from `.director/upstream/skills/`. Nothing is installed globally.
Neither agent may sign in to HeyGen, publish, share, render in the cloud, or use anything marked
HyperFrames Pro.

## One brief

`<nn>` is the brief's number, `tc` is `node bin/tough-crowd.mjs`.

1. **Two blank projects:**

   ```
   npx --yes hyperframes@0.9.72 init .director/bench/<nn>/stock --example blank --non-interactive --skip-skills
   npx --yes hyperframes@0.9.72 init .director/bench/<nn>/plugin --example blank --non-interactive --skip-skills
   ```

2. **The stock film.** A fresh agent is given the brief word for word, the path to the stock
   skills, and the `stock` project. It renders `out/film.mp4`.

3. **The plugin film.** A different fresh agent is given the same brief word for word, the stock
   skills, `skills/direct/`, and the `plugin` project. It is told the panel will be run for it.
   Whoever runs the test follows `skills/direct/references/panel.md` on its behalf: `packet`,
   three fresh judges, `tally`, send `PANEL.md` back, up to three runs, then `verify`. Run
   those commands from the plugin project folder, so the packets and `PANEL.md` land there and
   not in this repository's root.

4. **The comparison:**

   ```
   tc packet .director/bench/<nn>/plugin/out/film.mp4 --ab .director/bench/<nn>/stock/out/film.mp4 --brief bench/briefs/<file> --silent --out .director/bench/<nn>/ab
   ```

   Three fresh judges, each given only the brief `packet` wrote, then `tc tally .director/bench/<nn>/ab`.

5. **Record** the row in `bench/results.md`.

6. **The owner's pick.** Copy the two films to neutral names first: the paths themselves say
   `stock` and `plugin`. Use the letters the comparison already drew (`ab/key.json` maps each
   letter to its film) and copy them to `.director/bench/<nn>/owner/<letter>.mp4`. Give the
   owner those two paths, say nothing about which is which, and record their choice.

## Keeping it fair

- Both agents get the brief word for word and nothing about the other film, the panel's
  rubric, or this test.
- Neither agent is the session running the test, and neither has seen an earlier brief's films.
- The judges of the comparison have not judged either film before.
- Record the tokens and minutes of every agent: both builds, each panel run, the comparison.
- Record anything that had to be worked around in the tool or the skill. A workaround is a
  finding, not a detail.
