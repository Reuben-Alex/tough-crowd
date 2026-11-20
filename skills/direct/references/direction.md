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

The product here is invented for this example. Your film has its own idea, its own number of
shots and its own beats; take the format from this, not the story.

````markdown
# Direction: Margin

**The idea.** A rough paragraph tightens, in place, into the sentence it was trying to be.

```shots
0.0-2.0 | the draft
2.0-7.5 | the cuts
7.5-11.0 | the count
11.0-15.0 | the line
```

## 0.0-2.0 the draft

- **Action:** the cursor sweeps a selection across the rough paragraph and presses "Tighten",
  on a slow push in.
- **Hero:** the paragraph, 68% of the frame's width, on a page whose edges are all out of frame.
- **Others:** the toolbar and sidebar are cropped out; the "Tighten" button sits at the end of
  the selection.
- **Eye:** the selection sweep, left to right.
- **Hold:** 0.3 s on the pressed button.
- **Cause:** the press; the first wordy phrase takes a red underline.

## 2.0-7.5 the cuts

- **Action:** five phrases are struck through one at a time, and the line closes up after each
  before the next is struck. The camera drifts right with the cut.
- **Hero:** the line being cut, 72% of the frame's width.
- **Others:** the lines above and below, blurred 3 px at lower contrast.
- **Eye:** the strike, then the gap closing.
- **Hold:** 1.4 s on the finished sentence at full contrast.
- **Cause:** the sentence is complete; a word-count chip slides in under it.

## 7.5-11.0 the count

- **Action:** the chip counts down from "84 words" to "31 words", and each cut phrase appears
  faintly in the margin beside the place it was cut, joined to it by a red hairline.
- **Hero:** the finished sentence with its chip, 70% of the frame's width.
- **Others:** the margin notes, smaller, blurred 1 px, at half contrast.
- **Eye:** the count, then the margin notes.
- **Hold:** 1.5 s after the last margin note.
- **Cause:** the margin notes fade; the page recedes and softens.

## 11.0-15.0 the line

- **Action:** "Say it once." arrives as one line, then the Margin mark draws beneath it.
- **Hero:** the serif line, 12% of the frame's height.
- **Others:** the page behind it, blurred 20 px at a third of its contrast, still on screen.
- **Eye:** the line, then the mark.
- **Hold:** 1.75 s after the mark.
- **Cause:** the film ends.

**The ending's focal point:** the line. The mark is 9% of the frame's height.
````
