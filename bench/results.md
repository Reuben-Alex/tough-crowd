# Test results

See `PROCEDURE.md` for how each row is produced and for the rule that decides whether the
project continues.

| Brief | Panel preferred (votes) | Criteria won by plugin film | Owner preferred | Plugin film's own panel: runs, rejections left, reaches the bar | Stock build: tokens, minutes | Plugin build: tokens, minutes | Judging: tokens, minutes | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Tally | Plugin film, 3 of 3, each "clearly" | 6 of 9 by majority (composition, payoff, stage, typography, rhythm 3 of 3; story 2 of 3). Stock won UI credibility and the ending 3 of 3. Slideshow feel: no majority | Plugin film, blind ("for the details") | 3 runs; 1 rejection left ("the ask", 3 of 3 in rounds 2 and 3); reaches the bar 0 of 3 in every round | 284k, 37 | 471k in all (first draft 271k, 31 min; two revisions about 200k, about 25 min) | Own panel, 9 judges: about 780k, 2 to 2.5 min each. Comparison, 3 judges: about 306k, 2.5 to 3 min each | See notes 1 to 6 |
| 02 Ferry | Stock film, 3 of 3, each "clearly" | 1 of 9 by majority (story 3 of 3). Payoff 2 of 3 to the plugin film, its only other majority. Stock won stage, UI credibility, rhythm, ending and slideshow feel 3 of 3, composition and typography 2 of 3 | pending | 3 runs; 3 of 4 rejected in every run, a different set each time; reaches the bar 0 of 3 in every round | 201k, 12 | 316k in all (first draft 206k, 13 min; two revisions about 110k, about 14 min) | Own panel, 10 judges (one re-run): about 815k, 1 to 1.5 min each. Comparison, 3 judges: about 301k, 2 to 2.5 min each | See notes on brief 2 |
| 03 Pocketleaf | | | | | | | | |
| 04 Gauge | | | | | | | | |
| 05 Loop | | | | | | | | |

**Running total:** panel 1 of 2, owner 1 of 1 (brief 2 pending). One brief lost; a second loss
on either count stops the test.

## Notes on brief 1 (2026-11-20)

1. **Brief 1 is contaminated as a test of transfer.** The skill's worked example
   (`skills/direct/references/direction.md`) is this same Tally brief, and the plugin agent
   reported following its five-shot structure closely. Brief 1 shows the tool, the panel and the
   revision loop work end to end. It does not show the skill transfers to a product it has not
   seen. Replace the worked example with a product outside this test set before briefs 2 to 5.
2. **The loop moved the film.** Rejected shots went 2 of 5, then 1 of 5, then 1 of 5. The two
   round 1 rejections were both accepted from round 2 on, and the judges' description of the
   stage went from "a mockup on a backdrop" to "a designed stage".
3. **One shot was never fixed.** "The ask" was accepted 2 to 1 in round 1, then rejected 3 to 0
   in rounds 2 and 3 after the camera was reworked. The film was delivered with that rejection
   stated, as the rules require.
4. **Judges were stricter alone than when comparing.** All nine single-film judges said the
   plugin film does not reach the bar. All three comparison judges, seeing it beside the stock
   film, said it does and rejected none of its shots. Treat "reaches the bar" from a comparison
   as unreliable; the single-film panel is the stricter measure.
5. **Cost ran over the estimate.** About 1.84 million tokens for this brief against an estimate
   of 1.1 to 1.4 million. A judge costs about 87k tokens, not the 50k assumed, and the plugin
   film used all three panel runs.
6. **Workarounds and findings in the tool and the skill.**
   - Whoever runs the panel has to re-type each judge's reply into its answer file. That is
     slow, costs output tokens and risks transcription errors. Judges should write their own
     answer files.
   - The panel's requests conflicted with the skill three times (a pull-back opening against
     "one forward progression"; a shorter hold against the 1.25 second rule; the brand as the
     ending's focal point against the worked example's claim). The agent followed the panel on
     two and the skill on one.
   - In round 1 every judge noted the card stayed centred at one size: the skill did not make
     the agent move the camera until the panel asked.
   - In round 1 every judge called the `warm-paper` preset stage flat. The preset alone does
     not read as a designed stage.
   - A panel fix reached into an accepted shot (the highlight sweep moved earlier to answer the
     send press). The rule "do not touch accepted shots" needs an exception for a fix that
     crosses a shot boundary.
   - Both agents hit a Bash heredoc failure when writing files that contain a fenced block and
     apostrophes, and used the Write tool instead.
   - The stock agent's `hyperframes add` wrote to the system clipboard and left unused
     component files and a lock file in its project.
   - The plugin agent's run was interrupted once by a usage limit and resumed without loss.

## Changes after brief 1 (2026-11-21)

Made before briefs 2 to 5, so their rows do not measure the same skill as row 1.

1. **The worked example moved off the test set.** `skills/direct/references/direction.md` now
   uses an invented writing app with four shots instead of the Tally brief, and every hold of a
   finished result in it meets the 1.25 second rule. This answers note 1.
2. **Judges write their own answer files.** The judge prompt names `judge-<n>.json` in the
   answers folder, so nobody re-types replies. A judge whose harness cannot write files still
   replies with the object. Answer files that start with a byte-order mark are now accepted.
   This answers the first point of note 6.

## Notes on brief 2 (2026-11-21)

The first brief run after the changes above, and the first on a product the skill's example
does not use.

1. **The panel preferred the stock film, 3 of 3, each "clearly".** The plugin film won only
   story (3 of 3). The stock film won stage, UI credibility, rhythm, the ending and slideshow
   feel 3 of 3. Judged alone in the comparison, the stock film had 1 to 2 shots rejected per
   judge and the plugin film 4 to 5.
2. **The loop did not converge.** The plugin film had 3 of 4 shots rejected in every round,
   and the set changed each time. The command: rejected, rejected, accepted. The crossing:
   rejected, accepted, rejected. The ending: accepted, rejected, rejected. Each revision fixed
   what was named and broke or exposed something else. On brief 1 the loop moved the film; here
   it churned.
3. **The first draft broke the skill's own staging rules.** Round 1 judges found the command
   small in the top left of a mostly empty window, and the result line likewise: rule 1 (the
   hero at 60% of the frame's width or more) and rule 7 (edges and margins). The skill states
   the rules, but nothing checks them before the panel does.
4. **An accepted shot was rejected after a change elsewhere.** The ending was accepted in
   round 1. Changing the whole film's stage for round 2 (a panel request on another shot)
   changed its backdrop, and two of three new judges rejected it. "Do not touch accepted shots"
   cannot hold when a fix is film-wide.
5. **The late changes pulled the film towards title cards.** Round 3's ending, rebuilt from
   P1 notes, was called "two title cards joined by a blur dissolve" by a comparison judge.
   The stock film kept the product on screen into its end card.
6. **Workarounds and findings in the tool and the skill.**
   - One round 2 judge wrote an answer with no `priority` on any must-fix item. `tally`
     refused it by name, the file was set aside, and a new judge 2 was run, as `panel.md`
     says. The refused file is kept in `single-r2/refused/`.
   - Judges writing their own answer files worked for all 13 judges on this brief, including the one re-run:
     nothing was re-typed.
   - The plugin agent read judges' pixel sizes as unreliable (it said they read downscaled
     sheets) and worked from their relative complaints instead.
   - Two P0 notes conflicted in round 2 (keep the bar 80 px or more from the top, and centre
     the success line in a short window). The agent resolved it by shrinking the bar.
   - Both agents installed the `code-terminal-run` registry component to read it, then
     deleted it. The stock agent briefly ran a local preview server and stopped it.
