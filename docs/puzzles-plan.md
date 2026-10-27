# Puzzles: 75 puzzles in three tiers

**Status: done (P1 to P5).** Beginner, Normal and Expert hold 25 puzzles each; ids are fixed because saved progress uses them.

## Shape
- `src/engine/data/puzzles/`: `index.ts` (the pack, `puzzlesIn`, `puzzleById`, the daily pick), `tiers.ts`, `helpers.ts` (`puzzle()` builds a position from short specs such as `'lead 0,3; foot 1,1 hp2'`), `beginner*.ts`, `normal*.ts`, `expert*.ts`, `solver.ts`.
- Each puzzle has `limit` (turns you have), `solution` (one way to win), two `hints` (a nudge, then the idea; the Hint button's third tap shows the move itself) and `difficulty` (set by the tier: easy, normal, hard Umbral AI).
- Tier limits: Beginner 1-2, Normal 2-3, Expert 3-5 (the Expert pack is all 3). Puzzles play with court passives off so the position works exactly as drawn.

## Checks (`puzzles.test.ts`)
- The stated solution wins against the real Umbral AI, answering with the seed the game gives it.
- No faster win exists (a solver over Solari's actions; the rival passes unless `rivalMatters` is set, in which case the real AI answers).
- Every fight in a solution, and every attack the rival makes on that line, comes out the same across the whole range of the stub duel's luck, so no puzzle depends on a coin flip.
- The second hint names the first move's piece or spell; the packs are full; every role and every spell a Solari Leader can cast appears in some solution (Shroud and Sacrifice are Umbral-only).

## Tools
- `npm run puzzles [-- --id <id> --rival pass|ai --turns N]` prints the fewest turns, the winning lines and the number of distinct first moves.
- `npm run show [-- <id>]` draws a puzzle's board and plays its solution against the AI.
- `npm run mine -- --tier normal --need <spell> --out file` searches for random positions that need a given spell. The Expert pack was mined with the normal AI (fast) and re-checked against the hard AI before use.

## Notes
- Hints and puzzles are free to retry; nothing is locked.
- A Bind lasts one rival turn and cannot touch a piece on a beacon, so the Bind puzzles are about timing.
