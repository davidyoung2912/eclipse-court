# Grand board: an optional 9x9 board with its own pieces and movement rules

**Status: G1 and G2 done; G3 to G5 not started.** Each phase ends with a commit and a stop (see CLAUDE.md). Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing.

## Decisions
- **7x7 stays the default and stays untouched.** Nothing about the 150 campaign battles and scenarios, the puzzles, the tutorial or the existing boards changes. 9x9 is an extra, never a migration.
- **Board size is match config data**: `MatchConfig.size?: 7 | 9`, absent meaning 7, so old saved games and share codes keep working and the code format version does not change.
- **New pieces and movement rules exist only on 9x9.** Nothing new reaches 7x7 drafts, so the tuned 7x7 balance is safe.
- **Rule extensions come before new pieces.** Wider move ranges fix pacing for every role; a new piece only helps its own slot. New pieces are added only if the simulations show the rules are not enough.
- **Skirmish** gets a board-size option (9x9 boards unlocked by stars, like the other boards) with its own board variants.
- **Campaign** gets a new set of hand-built 9x9 battles (about 10 to 15, a fourth tier or a "Grand Court" group), not a size toggle on the existing ones.
- **Story Act III grows from 3 chapters to 5** with two 9x9 battles, to match Acts I and II.

## Geometry (from G1)
The board geometry is a function of the size, in `src/engine/rules/board.ts`:
- Centre `(size-1)/2` on both axes; home-edge middles at `x = 0` and `x = size-1`.
- Cycling zone: the diamond within `(size-1)/2` steps of the centre (radius 3 on 7x7, 23 squares; radius 4 on 9x9, 39 squares), minus the home-edge middles. Rings are Manhattan steps from the centre, so 9x9 has four cycling rings rather than three, and the ripple lag in `ringLuminance` simply reaches one ring further.
- Default beacons: home-edge middles, the centre, and the top and bottom middles.
- Showdown: the safe radius starts at the cycling radius (3, or 4) and shrinks every two rounds.
- Mirror: `size - 1 - x`. Promotion column: `size - 1` for Solari.
- The 7x7 exports `SIZE`, `CENTER`, `HOME_EDGE_MIDDLE` and `BEACONS` remain as the standard board's constants.

## Open numbers (to settle with simulations in G2)
| Setting | 7x7 today | 9x9 proposal |
| --- | --- | --- |
| Pieces per court | 12 | 16 (4 more: extra footsoldiers, a third flier or charger) |
| Cycling radius | 3 | 4 |
| Footsoldier / Bruiser move | 1 | 2 (forward-biased or any direction, to be tested) |
| Marksman move | 2 | 3 |
| Flier / Aura move | 3 | 3 or 4 |
| Leader teleport | 4 | 5 |
| Round limit / Eclipse round | 50 / 30 | to be tuned; target median game length at or below 7x7 |
| Light bonus | none | a piece on a square lit for its court moves 1 further |

Sim targets (as in the growth work): side split within noise of 50/50 at 30 or more games, median round count no worse than 7x7, promotions per game above 0.3, and no stalemates before the round limit.

## Phases
- **G1 (done): geometry refactor (no behaviour change).** Add `MatchConfig.size`, the geometry helpers, and pass the size through every consumer: moves, spells, cells, growth, the reducer, the showdown radius, serialization limits, the roster mirror, the Dial, the Board and the AI. 7x7 results must be identical; all existing tests pass unchanged, with new tests for 9x9 geometry.
- **G2 (done): 9x9 rules and boards.** Size-dependent move ranges and the light bonus (a rules table keyed on size), a 16-piece layout, the Leader teleport range, and two or three 9x9 board variants (an open one, one with pillars, one with cells). Tune with AI-vs-AI sims. Add `npm run grand`.
- **G3: new 9x9 pieces (only if needed).** Candidates: Scout (up to 4 in a straight line, cannot capture, quick to take beacons), Warden (slow, damage-reducing aura for neighbours) and Siege (attacks from 3 or more squares). Each needs art for both courts, duel behaviour, `pieceInfo` text, AI values and matchup data. Available only when `size` is 9.
- **G4: Skirmish and the 9x9 campaign tier.** The Skirmish size option and star gating, the 9x9 battles with their own tier, progress and unlocks, and tip cards.
- **G5: Story Act III extended.** Two new chapters between the existing ones (so the act reads as five steps, ending with the Sanctum), each with a 9x9 battle, new bound characters where needed, and updated tests for act lengths.

## G1 notes
- Functions that need the size take it as a final optional argument defaulting to 7 (`inBounds(p, size)`, `ringOf(p, size)`, `isCycling(p, size)`, `fixedCourt(p, size)`, `allSquares(size)`), and callers with a state or config pass `sizeOf(config)`.
- Share-code validation reads `size` first, then checks every position against that size.
- No UI work beyond making the Board and Dial follow the size; there is no way to start a 9x9 game until G2.
- Done: `MatchConfig.size`, `BoardSize`, `sizeOf`, `centerOf`, `homeEdgeMiddles`, `defaultBeacons`, `cyclingRadius` and `mirrorOf` in `board.ts`; moves, spells, cells, growth, luminance, the reducer, `safeRadius`, `startingPieces` (a size argument), share-code validation (`BOARD_SIZES`, size read first), the AI evaluation, the Board, Dial and CellCard all follow the config's size.
- One test change: two assertions in `board.test.ts` used `.filter(isCycling)`, which now passes the array index as the size, so they became arrow functions. Never pass these helpers straight to `filter` or `map`.
- New tests cover 9x9 geometry, a 9x9 game's mirrored armies, ring-4 ripple and showdown radius, and size in share codes. 7x7 behaviour is otherwise unchanged (all 417 tests pass).

## G2 notes
- `MOVE_RANGE` in `moves.ts` is the size-keyed rules table: 9x9 Footsoldier/Bruiser 2, Marksman 3, Flier/Aura 3 (Solari Flier light bonus unchanged), Leader teleport 5. The light bonus (`LIGHT_BONUS`) adds 1 to Footsoldier, Bruiser and Marksman moves while standing on a square in full light (|L| = 2) for their own court; 9x9 only.
- `GRAND_LAYOUT` in `roster.ts`: 16 pieces a side (7 Footsoldiers, 2 Chargers, 2 Fliers, 2 Marksmen, Bruiser, Aura, Leader). `grandConfig(overrides, boardId)` in `matchConfig.ts` builds a 9x9 match.
- `GRAND_BOARDS` / `grandBoardById` in `boards.ts`: Grand Open, Grand Pillars (6 walls), Grand Shrine (Might, Ward, Recovery cells). Kept apart from `BOARDS` so the 7x7 board tests and Skirmish pickers are untouched.
- `npm run grand [-- --games N --seed S]` compares 7x7 with the three boards (growth and promotion on). `growthGames` moved to `src/sim/growthGames.ts` so importing it does not run the growth CLI.
- Sim (30 games, seed 1): median round 37 on 7x7 against 38 on each 9x9 board, no unfinished games, 0.33 to 0.40 promotions per game. Side split Solari/Umbral: open 10/20, pillars 11/19, shrine 14/16, so Umbral leans ahead (35/90 for Solari), possibly noise. A larger run was not waited for; revisit the light bonus (threshold or off) if play shows a real imbalance.
