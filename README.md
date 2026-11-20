# video-director

A plugin that makes a coding agent direct a product film shot by shot on
[HyperFrames](https://hyperframes.heygen.com), and submit it to a blind panel of three judges
that can reject shots before the film is delivered.

**What it is.** A directing skill (one idea, a shot list, staging rules, stage and type presets)
and a small command-line tool that prepares frame sheets for judges, tallies their verdicts, and
refuses to pass a film that is not the one they judged.

**What it is not.** It does not render, capture, generate voice or music, or replace
HyperFrames. HyperFrames does all of that; this sits on top.

Status: early. The test in `bench/` decides whether it is worth continuing.

## Requirements

- Node 22 or newer
- FFmpeg 5.1 or newer on `PATH`, or `FFMPEG_PATH` and `FFPROBE_PATH` set to the executables
- The HyperFrames skills (`npx hyperframes skills`)
- For the panel, a harness that can start subagents (Claude Code can)

## Install

```
claude --plugin-dir /path/to/video-director
```

The skill is then available as `/video-director:direct`. In other harnesses, point the harness
at `skills/direct/` and run the tool with `node /path/to/video-director/bin/video-director.mjs`.

## How a film gets made

0. **Brief.** The request is saved word for word as `BRIEF.md`.
1. **Source.** A public product is captured with HyperFrames, not redrawn.
2. **One idea.** One sentence: the single thing the viewer watches change.
3. **Direction.** `DIRECTION.md`: the shots, and for each one the hero, its share of the frame,
   the hold, and what causes the next move.
4. **Stage and type.** One of three stage presets and three type pairings.
5. **Build.** With the HyperFrames skill. Every object has its own pose in every shot.
6. **Stock check.** `npx hyperframes check` passes.
7. **Panel.** Three fresh judges see only the brief and the frames. A shot two of them reject
   is rejected. Fixed shots are judged again by new judges, three runs at most.
8. **Deliver.** The judged file, `PANEL.md`, and a note that leads with anything still rejected.

## The tool

```
video-director packet <film> --brief BRIEF.md --direction DIRECTION.md [--round <n>] [--silent]
video-director packet <film> --ab <other film> --brief BRIEF.md [--silent]
video-director tally <packet folder> [--panel-out <file>]
video-director verify <film> [--panel <PANEL.md>]
```

| Command | Does | Exit code |
| --- | --- | --- |
| `packet` | Writes the judges' brief and time-stamped frame sheets under `.director/panel/`. With `--ab`, two films under neutral names | 0, or 2 on bad input |
| `tally` | Reads the three answers and writes `PANEL.md` | 0 nothing rejected, 1 a shot is rejected, 2 on bad or missing answers |
| `verify` | Confirms the file is the one judged and prints what the delivery note must lead with | 0, or 2 if it is not the judged file |

`skills/direct/references/panel.md` has the full procedure.

## Limits

- **Judges see stills.** Motion at speed and sound are not judged, and every `PANEL.md` says so.
  A person watching the film is still the only check on how it feels.
- **Judges are noisy.** Three judges and a majority reduce that; they do not remove it.
- **It costs more.** A judged film uses roughly 150k more tokens per panel run than an unjudged
  one. This is an estimate from early trials.
- **Films up to about 30 seconds**, landscape. Longer films are not what the panel is tuned for.
- **Public products only** for capture. Logged-in screens have to be supplied by the person.

## Development

```
node --test
```

The tests need FFmpeg. `examples/stages/` is a HyperFrames project showing the three stage
presets; check it with `npx hyperframes check` from that folder.

## Licence

Apache-2.0. HyperFrames is a separate project by HeyGen, also Apache-2.0; this plugin is not
affiliated with or endorsed by HeyGen or Anthropic.
