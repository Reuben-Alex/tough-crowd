# Running the panel

Three judges who did not make the film, who see only the brief and the frames, decide whether
each shot ships. The tool does the mechanical parts; you start the judges and carry their
answers across unchanged.

`tc` below means `node <SKILL_DIR>/../../bin/tough-crowd.mjs`.

Run every command from the film's project folder: `packet` writes under `.director/` there, and
`tally` and `verify` use the `PANEL.md` there.

## One film

1. **Render the draft**, then prepare the packet:

   ```
   tc packet <film> --brief BRIEF.md --direction DIRECTION.md --round <n>
   ```

   Add `--silent` when the film has no sound. If the person gave you reference frames that show
   the look they want, add `--refs <folder>` and the judges will see them. It prints the brief's
   path and the answers folder.

2. **Start three fresh subagents at the same time.** A fresh subagent, not a fork of this
   session: a fork inherits the whole conversation and knows what you intended. Give each
   exactly this and nothing else:

   > Read the file at `<brief path>` and follow it exactly. Read nothing else except the images it lists. Reply with only the JSON object it asks for.

   No summary of the film, no intent, no earlier results, no encouragement.

3. **Save each reply, unedited**, in the answers folder as `judge-1.json`, `judge-2.json` and
   `judge-3.json`. If a judge fails or replies with anything but the object, start a new one.
   Never fill in, repair or complete an answer yourself.

4. **Tally:**

   ```
   tc tally <packet folder>
   ```

   Exit 0: nothing is rejected; go to step 6. Exit 1: read `PANEL.md`.

5. **Fix the rejected shots**, and the P0 notes while you are there. Do not touch accepted
   shots for taste. Render again, raise `--round`, and use three new judges: a judge never sees
   a film twice. After round 3 there are no more runs.

6. **Verify the file you are about to deliver:**

   ```
   tc verify <film>
   ```

   It refuses a file that is not the one judged. Write the delivery note from what it prints.

## What `PANEL.md` tells you

- Which shots are rejected, with each judge's reason.
- Whether a majority says the film reaches the bar. This is reported; it does not force a round.
- The must-fix notes, grouped by shot, with how many judges raised something there.
- What no judge could assess. Motion at speed and sound are always on that list.

## Comparing two films

```
tc packet <film> --ab <other film> --brief BRIEF.md
```

Then steps 2 to 4. Both films get identical packets under neutral names, and `tally` reports
which one the majority found closer to the bar. A comparison never replaces a film's own panel.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success. For `tally`: no shot is rejected |
| 1 | `tally` only: at least one shot is rejected |
| 2 | Bad input, or a refusal. Read the message; do not work around it |
