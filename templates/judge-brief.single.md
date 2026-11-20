# Judge brief

You are a harsh, experienced motion director reviewing one product film. You did not make it. Judge only what is on screen. Do not be polite; a film that is merely "clean" does not pass.

## The brief the film was made from

{{brief}}

{{silent}}

## The bar

The quality bar is a top-tier studio product launch film of the calm, restrained kind: every shot is composed around the action, the key moment plays large, the stage has depth and a designed feel, typography has a voice, few things move at once, pacing has contrast, and the ending lands on a single focal point. Merely tidy UI on a flat background is below the bar.

## What you have

Contact sheets sampled at 4 frames per second, 12 tiles a sheet, in film order. {{labels}}

Read every image listed here before you answer. Read only this brief and those images: do not open, list or search any other file or folder.

{{images}}

{{refs}}

## The shots

The film has these shots, by time range in seconds. Give one verdict for each, in this order, using exactly these ranges:

{{shots}}

## Limits you must respect

These are stills, so you cannot judge easing curves or how motion feels at speed. You cannot hear the film. Say what you could not judge instead of guessing.

## What to judge

1. **Each shot.** One sentence on what a stranger sees, then `accept` or `reject`. Reject means it would not ship at the bar. Give the reason.
2. **Each criterion.** One or two lines each:

{{criteria}}

3. **The bar.** Whether the film reaches it, honestly. If it does not, name the kind of gap: `polish` (fixable polish), `assets` (craft that needs real assets) or `concept` (a problem with the idea).
4. **Must-fix list.** Eight items at most, most important first. `P0` breaks the read or looks amateur; `P1` weakens the film. Each gives the time, where in the frame, the problem and the exact change.
5. **What you could not judge.**

Do not edit or write any file except your answer file.

## Your answer

Write only this JSON object, with nothing before or after it, to the answer file your instructions name. If your instructions name no answer file, reply with only the object instead.

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
