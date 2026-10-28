# Improvement plan 2: clarity, depth and longevity

Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase; stop after each so the context can be cleared.

## A. Quality of life

1. **Threat overlay + odds preview** – a settings/board toggle tints squares the opponent could attack next turn; hovering or selecting an attack target shows the expected duel odds (from `matchup()`).
2. **Duel speed + skip** – a duel animation speed setting (normal / fast / instant) and a per-duel skip.
3. **Skirmish presets** – save, name, load and delete rule combinations on the setup screen.
4. **Save/resume everywhere** – resume for a Gauntlet fight in progress, puzzles and mail games, not just the one skirmish slot.
5. **AI "why" line** – an optional one-line reason after each AI move, drawn from the personality and the search's best-scoring factor.
6. **Suggested next step** – a "Suggested" row on the main menu after onboarding (unsolved puzzles in the current tier, next scenario, unplayed daily).

## B. New modes and fun

7. **Boss foes** – named ladder/campaign bosses with a signature rule (extra cast per turn, hazard start cells, ...), data-driven.
8. **Mayhem mutators** – optional chaos modifiers for skirmish (mid-game cell spawns, spell steals, piece swaps) with a Shard bonus.
9. **Seasonal rotating events** – a limited-time modifier on the daily/weekly games.
10. **Spectate links** – a watch link that replays a finished online game move by move.
11. **Co-op scenarios** – two players share the Solari side against a scripted AI (hot-seat first, online after).

## C. Longevity

12. **Endless generated puzzles** – expose the miner/solver as an endless, rated puzzle mode.
13. **Gauntlet meta-progression** – unlockable starting relics, a daily seeded run with its own streak.
14. **Legacy army** – carry Gauntlet veterans, perks and relics into skirmish as an optional army.
15. **Ladder season rewards** – season-end Shards by rank, a season banner cosmetic, a season history screen.
16. **Piece mastery goals** – per-role challenges ("win 10 duels with a Bruiser in the dark") with cosmetic rewards.
17. **Cosmetics depth** – rarer, pricier animated tiers (piece sets, board effects).

## D. AI and balance

18. **AI character** – behaviours beyond weights (baiter, Leader-guard) and a distinct Grandmaster tier; run the sim scripts across all rule pairings.

## E. Accessibility and reach

19. **Screen-reader move log** – `aria-live` announcements for moves, duels and spells; keyboard coverage for spells and the draft.
20. **Wide-screen layout** – board and tray side by side on tablets and desktops.
21. **String extraction** – move inline UI text behind a lookup so localization is possible later.

## Status

Phase 1 done: the Danger toggle (Settings and in-game button) rings own pieces under threat and shows attack odds on enemy pieces; off under fog. Phase 2 done: a Duel speed setting (Normal, Fast, Instant) and a Skip button in every live duel that plays the rest out with the duel AI at the auto-duel skill. Phase 3 done: My presets on the Skirmish setup screen save, name, load and delete up to 12 rule, army, board and twist combinations (kept in `eclipse-court:presets`, so backups include them). Phase 4 done: an unfinished Gauntlet fight and an unfinished puzzle or Puzzle Rush are kept (`eclipse-court:saved-fight`, `eclipse-court:saved-puzzle`, left out of backups) and offered as Resume Fight on the Gauntlet and Resume Puzzle on the Puzzles screen; games by link already persist per game in the mail list. Phase 5 done: an AI reasons setting (Settings, Play aids) shows one italic line under the objective explaining the AI's latest move while it is your turn, written by `explainMove` in `src/ai/why.ts` from the position (attack odds, beacon, retreat of the wounded, light, spell) in the foe's personality voice. Phase 6 done: a Suggested section on the main menu (after the tutorial, hidden while First steps shows) lists up to three next steps from `suggestions` in `menuModel.ts`: unplayed daily match, daily puzzle and weekly, then the first tier with unsolved puzzles, then the next uncleared scenario. Phase 7 done: three ladder bosses (`src/engine/data/bosses.ts`: the Veil Sister, the Ash Tyrant, the Hollow King, rated 1650–1800) unlock once the peak rating reaches 1500 and are listed under Bosses on the Ladder. Each adds a signature rule through match settings; the new `freeCast` setting lets a court's first cast each turn leave the turn going. Campaign bosses keep their existing rule text. Phase 8 done: three Mayhem mutators under Twists on the Skirmish setup (`src/engine/rules/mayhem.ts`, `config.mayhem`): Cell spawns (a mirrored pair of cells every 3 rounds), Spell thefts (a spell leaps between Leaders every 5 rounds) and Piece swaps (two same-role pieces trade places every 4 rounds), all decided by the seed and applied after each round; the dial notes what happened, and each adds 10% to the Shard multiplier. Phases 9 onward not started.
