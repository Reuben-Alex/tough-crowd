# Video Director: design

Date: 2026-11-20
Status: awaiting approval
Working name: `video-director` (my call; rename freely)

## Intent

A plugin that lets a coding agent (Claude Code first, any skills-compatible harness after) make
short product films at a visibly higher quality than the agent gets from HyperFrames alone.

The owner's goal, in their words: "getting the best output". Staying ahead of competitors is
explicitly not the goal. The quality reference is the calm, product-led launch and demo films
Anthropic publishes for Claude.

## Why this shape

Research and two throwaway spikes on 2026-11-20 settled what to build.

- HyperFrames (HeyGen, Apache 2.0, free for local use) already ships the engine and the tools:
  HTML-to-video rendering, website capture, local voice and transcription, a `check` command for
  layout, contrast and craft faults, frame snapshots, and a detailed authoring skill with motion
  rules and a self-review pass.
- A fresh agent using only the stock skills produced a clean 15-second film that passed every
  check. It was "clean mockup", not launch-film quality: the camera zoomed into one fixed window,
  the payoff played small, the stage was flat, and the ending was a captioned screenshot. Its
  self-review found only pixel nudges and it shipped the shot it named as its weakest.
- A second film from the same brief, directed shot by shot and revised against an outside critic,
  was judged "clearly" closer to the bar in two blind critiques (7 of 9 criteria, then 8 of 9).
  Both critics said neither film reaches the bar.
- The lift came from direction (one idea, each shot composed around its action) and from a judge
  who was not the author. It did not come from tooling: both films used the same engine and both
  passed the same checks.
- One critic alone is noisy. Round 1 accepted a shot and suggested a change; round 2 rejected the
  shot after that change was made.

So the product is the missing layer only: a directing process and an independent critic panel,
on top of HyperFrames.

## Goals

1. A fresh agent with this plugin, given a plain brief, makes a film that blind judges prefer to
   the stock HyperFrames result for the same brief.
2. No film is delivered as "done" on the author's say-so. An outside panel accepts or rejects each
   shot, and the delivery note states plainly what the panel still rejects.
3. Free to install and use: local HyperFrames features only, no account, no API key.

## Non-goals (v1)

- Any rendering, capture, voice, transcription or audio tooling of our own. HyperFrames has them.
- Judging sound. Judges see pictures only; the panel report says so.
- Capturing logged-in product screens. Public sites go through HyperFrames `capture`.
- Films longer than about 30 seconds, vertical formats, or multi-language output.
- A hosted service, a UI, or accounts.

## Anti-goals

- Becoming a fork or a rival of HyperFrames.
- A gate the author can waive, soften or skip.
- A score out of 10 with no actionable notes.
- Shipping anyone else's footage, logos, fonts or brand look. The plugin teaches craft; the brand
  comes from the person's own kit.
- Using HyperFrames Pro features, or anything that needs a HeyGen sign-in.

## Constraints

- HyperFrames CLI (pinned version, 0.9.72 at time of writing), Node 22 or newer, FFmpeg.
- Must work on Windows, macOS and Linux. Development happens on Windows 11.
- Judges are subagents of the host harness, so the panel needs a harness that can start
  subagents. Where it cannot, the film is delivered marked "unjudged"; there is no fallback to
  self-review dressed up as a panel.
- Licence: Apache 2.0, matching HyperFrames (my call).

## Approaches considered

1. **Skills only.** Instruction files on top of HyperFrames. Fast, but the spike showed stock
   instructions were already rich and the agent still shipped a weak film, because nothing outside
   the author judged it.
2. **Skills plus a full toolkit** (capture, voice, motion library, review). This was picked first,
   then dropped when the HyperFrames command list showed it already ships almost all of it.
3. **Our own scene format** compiled to HyperFrames or Remotion. Dropped: it caps what films can
   look like and doubles the work for independence nobody needs yet.
4. **A director layer on HyperFrames (picked).** A directing skill, a blind critic panel with a
   small deterministic tool behind it, a few stage and type presets, and a test set that decides
   whether the project continues. Picked because it builds only what the spike showed was missing,
   and takes one to two weeks rather than months.

## The design

Four parts.

### 1. The directing skill

A skill the agent loads before it writes any composition. It adds a directing pass in front of
the stock `/hyperframes` workflow and a panel gate behind it. It does not restate HyperFrames'
contract; it tells the agent to follow the stock skill for everything about how to build.

The pass, in order:

1. **Source.** If the brief names a public URL, run HyperFrames `capture` and build from the real
   interface. Invent UI only when there is no source, and say so in the delivery note.
2. **One idea.** One sentence naming the single thing the viewer watches change (for the spike:
   "each messy note line turns into its task row, in place"). No shot list is written until this
   exists.
3. **`DIRECTION.md`.** The shot list, three to six shots for a film up to 30 seconds. For each
   shot: time range, the action, the hero object and how much of the frame it fills, what every
   other object is doing (soft, dim, off), where the eye goes, how long it holds, and what on
   screen causes the move into the next shot.
4. **Stage and type.** Pick one stage preset and one type pairing (part 3), adjusted to the
   person's brand colours.
5. **Build.** Objects are separate elements with their own pose per shot. The film never zooms
   around inside one fixed layout.
6. **Stock check.** HyperFrames `check` must pass.
7. **Panel.** Render a draft and run the panel (part 2). Fix what it rejects and have it judged
   again. Three panel runs at most by default: the first judging and up to two revisions.
8. **Deliver** with `PANEL.md` and a note that leads with anything the panel still rejects.

Staging rules the skill carries (each came from a critic rejection in the spikes):

- The acting element is the largest thing in frame, about 60% of frame width or more.
- The payoff plays at hero size. Never build the result small and enlarge it afterwards.
- A finished result holds at full contrast for at least 1.25 seconds before anything dims or moves.
- One forward progression. No in-out-in-out camera.
- One thing changes at a time. A row's details settle before the next row starts.
- Put secondary things out of focus with blur, not by fading them toward white.
- Edges are fully in frame with 80 px or more of margin, or fully out. No slivers, no tangents.
- A proof beat shows cause and effect together (which words became which field).
- No blank frame between the product and the closing line; the product stays on screen, soft.
- The ending has one focal point, and the brand is large enough to read.

### 2. The critic panel

Two pieces: a small command-line tool that does the mechanical work the same way every time, and
skill instructions for running the judges.

**`packet`** takes a rendered film and prepares what judges see:

- contact sheets at 4 frames per second, time-stamped, 12 tiles a sheet;
- denser strips (12 frames per second) across each shot change, taken from the time ranges in
  `DIRECTION.md`, so judges see the moves and not only the holds;
- `judge-brief.md`: the original brief, the quality bar, the rubric, the shot time ranges (times
  only, none of the author's intent), the limits of what stills can show, and the required answer
  format;
- neutral names. In A/B mode it takes two films, gives each a random neutral name, and keeps the
  mapping in a file judges are never given.

**Judges.** Three fresh subagents by default. Each receives only `judge-brief.md` and the image
paths: no conversation, no author notes, no hint of which film is which. Each returns a structured
answer: accept or reject for every shot with a reason, one note per rubric criterion, whether the
film reaches the bar, a ranked must-fix list (`time · where · problem → exact change`, P0 or P1),
and what it could not judge.

**`tally`** takes the judges' answers and writes `PANEL.md`: per shot, the verdict by majority
(two of three rejecting rejects the shot); the merged must-fix list with how many judges raised
each item; whether a majority says the film reaches the bar; and everything no judge could assess.
It exits non-zero when any shot stands rejected, so the result cannot be read as a pass by
mistake.

Rules:

- The author cannot overrule the panel. It can fix and resubmit, or deliver with the rejection
  stated first in the delivery note.
- A new round uses new judges, so a judge is never anchored on its own earlier notes.
- Every `PANEL.md` states that motion at speed and sound were not judged.
- **What triggers another round:** only a shot rejected by majority. A majority saying the film
  "does not reach the bar" does not force a round (both spike films missed the bar, so it would
  burn every round on every film); it is reported at the top of `PANEL.md` and in the delivery
  note. P0 notes on accepted shots are advisory and are fixed when a round is happening anyway.
- **The delivered film is the one last judged.** No edits after the final panel run. `tally`
  records a hash of the judged file in `PANEL.md`.
- **How firm the gate is (my call):** the failure the spikes showed was an author settling for
  its own work, not an author cheating. So v1 enforces the gate with instructions plus two
  mechanical checks that work in any harness: `tally`'s non-zero exit, and a `verify` command
  that refuses unless a `PANEL.md` exists whose hash matches the file being delivered, and prints
  the open rejections the delivery note must lead with. Harness-specific hooks that block
  delivery outright are left for later.

**A/B mode** (used by the test set, and available to anyone comparing two films):

- Both films get identical packets: contact sheets only, sampled the same way. Transition strips
  are left out, because a stock film has no `DIRECTION.md` and unequal packets would give away
  which film is which.
- Each judge answers as in the single-film panel for both films, then names the film closer to
  the bar (one, the other, or no difference) and the stronger film on each of the nine criteria.
- `tally` reports the panel's preference as the majority of the judges' overall picks (two of
  three). No majority counts as "not preferred". The per-criterion counts are reported alongside
  but do not decide the preference.

The rubric (nine criteria, from the spikes): shot composition; scale and clarity of the payoff;
stage and art direction; typography; whether the UI reads as a real product; story clarity from
pictures alone; rhythm and restraint; the ending; slideshow feel.

### 3. Stage and type presets

Three stage presets and three type pairings to start (my call on the number), written as copyable
HTML and CSS blocks in the skill's reference files. A stage preset is a ground, a light that
drifts slowly through the film, fine grain, a vignette and a layered shadow recipe. Type pairings
use only fonts HyperFrames bundles, so nothing needs licensing or shipping. Presets take the
person's colours; none imitates an existing brand.

Both critics said the remaining gap is a designed stage (a ground plane, directional light, a
depth layer). The presets are the first step toward that, not the whole answer.

### 4. The test set and the continue-or-stop test

Five briefs for five different fictional products (web assistant, developer tool, mobile app, data
dashboard, consumer service), each a silent film of 15 to 20 seconds.

For each brief: one fresh agent makes the film with stock HyperFrames skills, another fresh agent
makes it with stock skills plus this plugin, and the two are judged blind in A/B mode.

**The project continues only if both hold:**

- the panel prefers the plugin film on at least 4 of 5 briefs, and
- the owner prefers the plugin film by eye on at least 4 of 5.

If either fails, the project stops and the recommendation is to use HyperFrames as it is.

Running order and cost (my calls):

- The first brief is the spike's Tally brief (Appendix C). The spike's films were deleted at the
  owner's request, so they cannot serve as a fixture; repeating the brief is the calibration. The
  spike's result on it was the directed film "clearly" preferred, and a panel that does not
  reproduce a preference there is looked at before the other briefs are run.
- Stop early as soon as the outcome is decided: two briefs lost means 4 of 5 is out of reach.
- Rough cost, from the spike's token counts and not measured for this design: 1.1 to 1.4 million
  tokens a brief (two builds, the plugin film's own panel runs, and the A/B judging), so 5.5 to 7
  million for all five.

### Packaging

One repository that is both a Claude Code plugin and a skills-compatible package, with the
`packet` and `tally` tool runnable through `npx` so other harnesses can use it. It requires the
HyperFrames skills to be installed and says so on first use.

## End to end

```
brief
  → source (capture the real UI if there is a URL)
  → one idea
  → DIRECTION.md (shots, hero sizes, holds, causes)
  → stage + type preset
  → build with the stock HyperFrames skill
  → hyperframes check passes
  → render draft
  → packet → 3 blind judges → tally → PANEL.md
        ├─ a shot is rejected → fix those shots → new judges (2 rounds at most)
        └─ nothing rejected, or rounds used up
  → deliver: film + PANEL.md + note that leads with what is still rejected
```

## Decided by the owner

- Quality reference: Anthropic's demo and promo films.
- To be released for other people to use.
- Best output matters more than owning something hard to copy.
- Build the small director layer on HyperFrames, with a test that can stop the project.

## My calls (check these while reading)

- Working name `video-director`; licence Apache 2.0.
- Claude Code first; other harnesses through the standard skills format and `npx`.
- Three judges, majority rejects, three panel runs at most (two revisions), new judges each
  round.
- Only a rejected shot forces another round; "does not reach the bar" is reported, not gated.
- The gate is enforced by instructions, `tally`'s exit code and a `verify` command, not by
  harness hooks.
- In A/B mode the panel's preference is the majority of the judges' overall picks.
- The test set starts with the spike's Tally brief and stops early once the outcome is decided;
  running all five is estimated at 5.5 to 7 million tokens.
- Judges get shot time ranges but none of the author's intent.
- No reference footage ships with the plugin. A person may drop their own reference frames into
  the project and `packet` will include them for the judges.
- Sound is out of the panel's scope in v1. The directing skill defers to HyperFrames' own sound
  guidance and tools, and the panel report says sound was not judged.
- Three stage presets and three type pairings.
- Test briefs use fictional products.
- Expected cost, from the spikes and not yet measured for this design: roughly 50k tokens per
  judge per film, so about 150k tokens a round on top of the build.

## Left to the builder

- The tool's language and layout (plain Node with no build step is the obvious fit), argument
  names, file locations under the project, and the exact answer schema.
- How shot time ranges are read from `DIRECTION.md` (a fenced block or front matter).
- Sheet sizes and how many strips, tuned so three judges stay near the cost above.
- How the plugin detects that HyperFrames skills and FFmpeg are present.
- Tests for `packet` and `tally` (a generated test clip is enough).
- The wording of the five briefs.

## Risks

- **The lift may not transfer.** The spike's better film was directed by hand with hindsight. The
  test set exists to find this out early.
- **Judge noise.** Three judges and majority voting reduce it; they may not remove it.
- **Stills only.** Nobody in the loop watches motion at speed or hears sound. The denser strips
  help with moves; the owner's eye remains the only check on feel.
- **HeyGen may ship the same idea**, or change HyperFrames under us. Accepted: the goal is the
  best output, and Apache 2.0 keeps the current engine usable.
- **Cost.** A judged film costs noticeably more tokens than an unjudged one.

## Appendix A: the judge brief used in the spikes

This wording produced the two blind critiques. `judge-brief.md` starts from it. Square brackets
are filled in by `packet`.

> You are a harsh, experienced motion director reviewing [one film / two films made from the same
> brief]. You did not make [it / either]. Judge only what is on screen. Do not be polite; a film
> that is merely "clean" does not pass.
>
> **The brief.** [the original brief, verbatim] [Silent on purpose; do not mark down for missing
> sound.]
>
> **The bar.** The quality bar is a top-tier studio product launch film of the calm, restrained
> kind: every shot is composed around the action, the key moment plays large, the stage has depth
> and a designed feel, typography has a voice, few things move at once, pacing has contrast, and
> the ending lands on a single focal point. Merely tidy UI on a flat background is below the bar.
>
> **What you have.** Contact sheets sampled at 4 frames per second, each tile time-stamped, 12
> tiles a sheet. [paths] Read every image.
>
> **Limits you must respect and state.** These are stills, so you cannot judge easing curves or
> how motion feels at speed; say what you could not judge instead of guessing. The time-stamp
> label covers a little of each tile; ignore it. [Neither film is presumed better; each may win on
> different things, or both may fail.]
>
> **Report.** (1) Shot by shot: time range, one sentence on what a stranger sees, ACCEPT or REJECT
> (reject means it would not ship at the bar) with the reason. (2) One or two lines on each
> criterion [and which film is stronger]. (3) Whether the film reaches the bar, honestly [which
> film is closer, and by how much: slightly, clearly, decisively]; if not, what kind of gap
> remains (fixable polish, craft that needs real assets, or a concept problem). (4) A ranked
> must-fix list, eight lines at most: `t=… · where · problem → exact change`, P0 if it breaks the
> read or looks amateur, P1 if it weakens the film. (5) What you could not judge.
>
> Do not edit or write any files.

In the product the judges answer in the structured format `tally` reads, not free text, and they
are given the shot time ranges so their verdicts line up.

## Appendix B: the rubric

| Criterion | The question a judge answers |
| --- | --- |
| Shot composition | Is each frame composed around its action, without awkward crops, tangents or dead areas? |
| Payoff | Does the key moment play large and legible? |
| Stage and art direction | Is there depth, light and texture, so it reads as designed and not as a mockup? |
| Typography | Does the type have a voice and a clear hierarchy? |
| UI credibility | Does it read as a real product? |
| Story clarity | Would a stranger get the product's claim from the pictures alone? |
| Rhythm and restraint | As far as stills show: contrast in pacing, earned holds, no dead stretches, few things moving at once. |
| The ending | Does it land on one focal point, with the brand readable? |
| Slideshow feel | Does any part read as slides? |

## Appendix C: the spike brief (also test brief 1)

> Make a 15-second product scene, 1920x1080, for Tally, an AI assistant that turns messy meeting
> notes into a clean task list. I want it calm and product-led, in the spirit of Anthropic's
> launch films for Claude: the product UI is the hero, a prompt types in, the result builds, the
> camera moves in on what matters. Warm, restrained, premium. Not a slideshow.

Tally is fictional: the agent invents a plausible UI and its own brand for it, and copies no
existing company's logo, name or assets. Visuals only.
