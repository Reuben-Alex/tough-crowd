---
name: direct
description: Use when making, remaking or reviewing a product film, launch video, promo or demo with HyperFrames, or when a HyperFrames video reads as slides, a mockup or a screen recording.
---

# Directing a product film

## Overview

HyperFrames tells you how to build a film. This skill decides what the film is before you build
it, and puts a blind panel of judges between your render and the person.

It exists to stop two failures: a camera zooming around inside one fixed layout, and an author
approving its own work.

**A film is not done when you think it is good. It is done when the panel has judged the exact
file you deliver.**

## Requirements

- **The `/hyperframes` skill.** If it is not available in this session, stop and tell the
  person to install it with `npx hyperframes skills`. Follow it for everything about how a
  composition is built, checked and rendered. This skill never replaces it.
- **Subagents**, for the panel. A harness that cannot start them delivers the film marked
  **unjudged** (see The gate).
- **The tool.** Run it as `node <SKILL_DIR>/../../bin/video-director.mjs <command>`, where
  `<SKILL_DIR>` is this skill's base directory. Its commands are `packet`, `tally` and
  `verify`. It needs FFmpeg.

## The pass

Do these in order. Write no composition code before step 5.

| Step | What you produce | Read |
| --- | --- | --- |
| 0. Brief | `BRIEF.md`: the person's request, word for word | |
| 1. Source | The real interface, captured with `npx hyperframes capture <url>` when the brief names a public URL. Invented UI only when there is no source | `/hyperframes` |
| 2. One idea | One sentence naming the single thing the viewer watches change | `references/direction.md` |
| 3. Direction | `DIRECTION.md`: the idea, the `shots` block, and every required field for each shot | `references/direction.md`, `references/staging.md` |
| 4. Stage and type | One stage preset and one type pairing, in the person's colours | `references/stages.md`, `references/type.md` |
| 5. Build | The composition. Every object has its own pose in every shot | `/hyperframes`, `references/staging.md` |
| 6. Stock check | `npx hyperframes check` passes | `/hyperframes` |
| 7. Panel | A rendered draft, judged; rejected shots fixed and judged again | `references/panel.md` |
| 8. Deliver | The judged file, `PANEL.md`, and the delivery note | below |

## The gate

- You cannot overrule the panel. Fix what it rejects and submit again, or deliver with the
  rejection stated first.
- Only a rejected shot forces another round. "Does not reach the bar" is reported, not a reason
  to keep going.
- Three panel runs at most for one film. Every run uses new judges.
- The delivered file is the one last judged. Any edit after the last panel run makes it an
  unjudged file.
- `verify <film>` must exit 0 before you deliver. The delivery note leads with what it prints.
- No subagents in this harness: skip step 7, mark the film **unjudged** at the top of the
  delivery note, and say why. Your own review is not a panel and is never called one.

| Excuse | Reality |
| --- | --- |
| "`hyperframes check` passed" | Check finds faults, not quality. A film can pass every check and be a mockup. |
| "I named the weakest shot in my notes" | Naming it is not fixing it. If you can name it, the judges will reject it. Fix it before the panel. |
| "The panel is optional polish" | It is step 7. A film without it is unjudged. |
| "The judges are wrong about this shot" | Then fix it, or deliver with their rejection stated first. You do not get a vote. |
| "I'll tell the judges what I meant" | A viewer never hears what you meant. Judges get the brief file and the frames, nothing else. |
| "Two judges answered, that is a majority" | `tally` refuses fewer than three. Run the missing judge again. |
| "It is one small fix after judging" | An edited file is an unjudged file, and `verify` will refuse it. |
| "The brief says calm, so every move is slow" | Calm is long holds and few moves, not every move at the same slow speed. |
| "The UI is one window, so one layout" | One fixed layout with a zooming camera is the failure this skill exists to stop. |

**Red flags. Stop and go back to the step named:**

- Composition code exists and `DIRECTION.md` does not (step 3).
- A shot in `DIRECTION.md` has no hero share of the frame (step 3).
- The camera is one transform on one wrapper around the whole UI (step 5).
- You are about to say "done" and `verify` has not printed `Judged in round` (step 7).

## The delivery note

In this order:

1. Anything the panel still rejects, and whether it says the film reaches the bar, exactly as
   `verify` printed it. If the film is unjudged, say so here.
2. The one idea.
3. What was captured from the real product and what was invented.
4. That motion at speed and sound were not judged.
