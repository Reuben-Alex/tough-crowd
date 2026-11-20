# Staging

**Every shot gives each object its own pose.** The notes, the prompt bar, the result and the
closing line are separate elements; in each shot each one has a position, a size and a state
(sharp, soft, dim or off). The film never zooms around inside one fixed layout. A camera
cropping a layout built for a different framing gives sliced text, dead panes and slivers of
background.

Each rule below was a judge's rejection before it was a rule.

1. **The acting element is the largest thing in frame: about 60% of the frame's width or
   more.** If the prompt is being typed, the prompt is the hero. Prevents: the action sitting in
   a corner of a wide shot while half the frame is an empty pane.

2. **The payoff plays at hero size.** Build the result where it is large. Never build it small
   and enlarge it afterwards. Prevents: the key moment happening at thumbnail scale, with the
   camera arriving after it is over.

3. **A finished result holds at full contrast for at least 1.25 seconds** before anything dims,
   blurs or moves. Prevents: the only clean view of the result lasting under a second.

4. **One forward progression.** Each move takes the viewer further in or onward. Prevents: the
   in, out, in, out camera that reads as mechanical.

5. **One thing changes at a time.** A row's details settle before the next row starts.
   Prevents: the eye bouncing between four things changing at once.

6. **Put secondary things out of focus with blur**, and lower their contrast a little. Do not
   fade them toward white. Prevents: a pale, flat frame where depth collapses.

7. **Edges are fully in or fully out.** An edge that is in frame has 80 px or more of margin;
   otherwise crop it out completely. No tangents between two objects: overlap decisively or
   leave 40 px or more. Prevents: slivers of background, headers jammed against the top edge,
   and two objects reading as one.

8. **A proof beat shows cause and effect together.** If the product turned certain words into
   an owner and a date, show those words and those fields in one frame, linked by the same
   highlight. Prevents: a claim the pictures never prove.

9. **No blank frame between the product and the closing line.** The product stays on screen,
   soft, while the line arrives. Prevents: the product evaporating before the claim.

10. **The ending has one focal point**, and the brand is large enough to read: the mark at
    about 8% of the frame's height or more. Prevents: a captioned screenshot with two things
    competing, and a logo that is the least legible thing in the last frame.

## Checking a shot against the rules

Snapshot the middle of each shot (`npx hyperframes snapshot --at <times>`) and answer for each
frame, in writing, in `DIRECTION.md`:

- What is the largest thing, and is it the thing acting?
- Is any text cut by a frame edge or by another object?
- How much of the frame is empty and doing nothing?
- Where does the eye land first, and is that where the action is?
