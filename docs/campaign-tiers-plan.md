# Campaign tiers: 75 battles and 75 scenarios

**Status: C1 to C5 done; C6 and C7 to do.** Each phase ends with a commit and a stop (see CLAUDE.md). Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing.

The Campaign page (Battles and Scenarios tabs) gets collapsible **Beginner / Normal / Expert** sections like the Puzzles page, with 25 battles and 25 scenarios in each. A tier is its AI level: Beginner is `easy`, Normal is `normal`, Expert is `hard`, so no new field is needed (`CAMPAIGN_TIERS` in `engine/data/tiers.ts`, `battlesIn(difficulty)`, `scenariosIn(difficulty)`).

## Decisions
- Battles unlock in order **within a tier**; the first battle of each tier is open from the start. Scenarios are all open, as before.
- Progress is keyed by id, not position, so adding battles never shifts saved stars: `Progress.battles: Record<id, starBits>` (version 6) replaces `cleared` and `stars[]`. Older saves migrate by the first eight battles' ids (`LEGACY_BATTLES`); the old count of beaten battles becomes a plain win on each.
- Unchanged: the stars rules, board and spell unlocks by total stars, tournaments, the stat lines.
- The section to open on the page is the first tier with something unwon.
- A saved unfinished game stores its battle's position (`campaignIndex`); inserting battles in C2 to C4 can point such a save at a different battle, which only affects who receives the stars. Acceptable.

## Phases
- **C1 (done): structure.** Tier table, ids, `battles` progress with migration and `battleUnlocked`, tier sections on both tabs (a tier with no entries is hidden), tests. The 8 existing battles and 7 scenarios are sorted into tiers by their AI level.
- **C2 (done): Beginner battles.** 25 in all: the original two plus 23 in `campaignBeginner.ts` (helpers in `campaignHelpers.ts`). Easy AI, gentle twists (HP, army, board, one rule), personalities spread over the five. Tests: distinct ids and names, legal openings, every personality plays legal moves, soak.
- **C3 (done): Normal battles.** 25 in all: the original three plus 22 in `campaignNormal.ts`. Normal AI, harder twists often stacked two together (HP with a board or mode, spell loadouts, events, showdown, growth, promotion, reverse), all five personalities, a mini-boss last (`second-sun`). Tests cover the Normal tier alongside Beginner.
- **C4 (done): Expert battles.** 25 in all: the original three plus 22 in `campaignExpert.ts`, inserted before the Eclipse Queen, who stays the tier boss. Hard AI, stacked twists (big HP, modes, events, showdown, reverse, growth, promotion, spell loadouts), all five personalities, a second boss (`twilight-throne`) before the Queen.
- **C5 (done): Beginner scenarios.** 25 in `scenariosBeginner.ts` (shared builders in `scenarioHelpers.ts`): short survive, escort and hold situations, easy AI, large Solari edge, all five personalities, boards and a few rules.
- **C6: Normal scenarios.** Up to 25.
- **C7: Expert scenarios.** Up to 25; each is checked that the hard AI cannot beat it by passing alone, and that the bonus star is reachable.
- Each of C2 to C7 also updates the tier achievement text and the count assertions in tests (`25` per tier by C4 and C7).
