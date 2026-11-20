# DIRECTION.md

Written before any composition code. It is the plan the build follows, and its `shots` block is
what the panel tool reads to give judges the time ranges.

## Parts

1. **The idea.** One sentence naming the single thing the viewer watches change. Not a feature
   list and not a mood. If you cannot write it, you do not have a film yet.
2. **The `shots` block.** One fenced block tagged `shots`, one shot per line, `start-end | name`,
   times in seconds, in order, no overlaps. Three to six shots for a film up to 30 seconds. The
   shots must cover the whole film, from 0 to its last frame with no gaps: a stretch no shot
   covers would go unjudged, so the panel tool refuses it. When a revision changes the timing,
   update this block to match the render.
3. **One section per shot**, with every field below. A missing field is an unfinished shot.
4. **The ending.** Its single focal point.

## Required fields for each shot

| Field | What to write |
| --- | --- |
| Action | The one thing that happens |
| Hero | The acting object, and its share of the frame's width (60% or more) |
| Others | Every other object and its state: soft, dim, off, or where it sits |
| Eye | Where the viewer looks first |
| Hold | How long the finished state is held before the next move |
| Cause | What on screen causes the move into the next shot |

## A complete example

````markdown
# Direction: Tally

**The idea.** Each messy note line turns into its task row, in place.

```shots
0.0-1.3 | the mess
1.3-4.2 | the ask
4.2-8.8 | notes become tasks
8.8-11.6 | the proof
11.6-15.0 | the line
```

## 0.0-1.3 the mess

- **Action:** the last line of the notes finishes being typed.
- **Hero:** the notes card, 64% of the frame's width.
- **Others:** nothing else on stage.
- **Eye:** the block caret at the end of the last line.
- **Hold:** 0.2 s after the typing stops.
- **Cause:** the typing stops; the prompt bar rises.

## 1.3-4.2 the ask

- **Action:** "Turn these notes into tasks" is typed and sent.
- **Hero:** the prompt bar, 61% of the frame's width, in front.
- **Others:** the notes card behind it, smaller, blurred 3 px; the bar overlaps its lower 15%.
- **Eye:** the caret in the prompt bar.
- **Hold:** 0.2 s on the sent state.
- **Cause:** the send button is pressed; the bar drops away and focus returns to the card.

## 4.2-8.8 notes become tasks

- **Action:** each note line is highlighted and becomes a task row where it stands; filler
  lines close up; the count climbs to 5.
- **Hero:** the card, 76% of the frame's width once it has widened.
- **Others:** nothing else on stage.
- **Eye:** the line being highlighted, then its row.
- **Hold:** 1.25 s on the finished list, on a slow push.
- **Cause:** the list is complete; one row lifts out of it.

## 8.8-11.6 the proof

- **Action:** the source line appears under the lifted row; "marcus" and "by 14th" are
  highlighted, and the owner chip and date pill take the same highlight.
- **Hero:** the lifted row as its own card, 73% of the frame's width.
- **Others:** the list behind it, blurred 4.5 px and slightly darker; the stage still visible.
- **Eye:** the highlighted words, then the chips.
- **Hold:** 1.1 s after the second highlight.
- **Cause:** the lifted card dissolves; the list stays, softer.

## 11.6-15.0 the line

- **Action:** "Messy notes in. Clean tasks out." arrives word by word, then the mark draws.
- **Hero:** the two-line serif claim, 14% of the frame's height per line.
- **Others:** the list behind, blurred 22 px, at a third of its contrast.
- **Eye:** the claim, then the mark.
- **Hold:** 1.9 s after the mark.
- **Cause:** the film ends.

**The ending's focal point:** the claim. The mark is 88 px tall.
````
