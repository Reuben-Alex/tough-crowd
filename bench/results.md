# Test results

See `PROCEDURE.md` for how each row is produced and for the rule that decides whether the
project continues.

| Brief | Panel preferred (votes) | Criteria won by plugin film | Owner preferred | Plugin film's own panel: runs, rejections left, reaches the bar | Stock build: tokens, minutes | Plugin build: tokens, minutes | Judging: tokens, minutes | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Tally | Plugin film, 3 of 3, each "clearly" | 6 of 9 by majority (composition, payoff, stage, typography, rhythm 3 of 3; story 2 of 3). Stock won UI credibility and the ending 3 of 3. Slideshow feel: no majority | pending | 3 runs; 1 rejection left ("the ask", 3 of 3 in rounds 2 and 3); reaches the bar 0 of 3 in every round | 284k, 37 | 471k in all (first draft 271k, 31 min; two revisions about 200k, about 25 min) | Own panel, 9 judges: about 780k, 2 to 2.5 min each. Comparison, 3 judges: about 306k, 2.5 to 3 min each | See notes 1 to 6 |
| 02 Ferry | | | | | | | | |
| 03 Pocketleaf | | | | | | | | |
| 04 Gauge | | | | | | | | |
| 05 Loop | | | | | | | | |

**Running total:** panel 1 of 1, owner 0 of 0 (brief 1 pending).

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
