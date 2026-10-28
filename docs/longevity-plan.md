# Longevity and engagement: twelve additions

**Status: L1 and L2 done; L3 to L12 not started.** Each phase ends with a commit and a stop (see CLAUDE.md). Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing.

Goal: give players reasons to come back (goals, rewards, fresh content), help them improve, and make the game worth sharing. Every phase is a feature in its own right and none needs a later one, except where noted.

## What already exists (so we extend it, not rebuild it)
- **Gauntlet**: 8 stages, persistent army, perks, spells, four relics, rest stops (`engine/data/gauntlet.ts`, `ui/menus/Gauntlet.tsx`). Record is `progress.gauntlet`.
- **Achievements**: about 80, grouped on the Stats page, defined in `progress.ts` (`ACHIEVEMENTS`, `def(group, id, name, text, earned)`).
- **Themes**: four, unlocked by campaign stars (`settings.ts`).
- **Replay**: a viewer for a `GameRecord` (`ui/menus/Replay.tsx`), reached from Stats or a `#r=` link. Hints: `ai/hint.ts`. Share links: `share.ts`. Daily match with streak: `engine/data/daily.ts`. Tutorial and tip cards.
- **AI**: depth-limited search with personalities (`ai/strategy.ts`, `ai/profile.ts`), run in a worker (`ai/client.ts`).

## Decisions
- **New saved state gets its own `localStorage` key** (like Story) instead of bumping `PROGRESS_VERSION`, unless a phase must change existing progress. Each store is held in memory as well, so a device without storage works for the visit.
- **No balance changes.** Cosmetics never touch the engine. Modifiers and perks are opt-in rule switches that already exist or are added behind flags that default off.
- **No server.** Everything is local, share links or WebRTC.
- **Data-driven and tested.** New content is plain data validated by tests; pure logic lives outside React with unit tests.

## How the original twelve ideas map to phases

| Idea | Phase |
|---|---|
| 5. Post-game replay and review | **L1** |
| 2. Meta-progression and unlocks | L2 |
| 3. Achievements and mastery | L3 |
| 4. Weekly challenge | L4 |
| 7. Handicap and modifier toggles | L5 |
| 6. Ranked AI ladder | L6 |
| 1. Roguelike Gauntlet (extend what exists) | L7 |
| 8. Board and puzzle editor with share codes | L8 |
| 9. Juice | L9 |
| 10. Tutorial and onboarding polish | L10 |
| 11. Shareable replays and cards | L11 |
| 12. Async play-by-link | L12 |

## Phases
- **L1 (done): post-game review.** Analyse a finished game move by move with the strategy search: for each move, the value of the move played against the best move, classified as best, inaccuracy, mistake or blunder (luck in duels is ignored; only the decision is judged). The Replay viewer gets a Review button: an evaluation bar over the game (click to jump), the flagged move with the better one described and shown on the board, previous/next key moment buttons, and a per-side summary with an accuracy figure. Analysis runs in the AI worker with progress and can be cancelled. Open from Stats ("Replay Last Game") and from shared replay links. No new saved state. Done when the review is correct on known positions (tests) and the build is clean.
- **L2 (done): shards and cosmetics shop.** A wallet (`eclipse-court:shop`) of Shards, earned from finished games (more for harder opponents and first clears), achievements and daily/weekly play. A Collection page spends them on cosmetics: board themes (the four star-locked themes stay free unlocks), piece sets, capture effects, sound packs and Story codex art. Equip state is saved. Cosmetics are CSS variables, art variants and synth settings only.
- **L3: mastery and achievements.** Per-area mastery tracks (Campaign, Scenarios, Puzzles, Gauntlet, Grand board, Online) with levels that pay Shards. About 25 new achievements, including review-based ones ("a game with no mistakes"), a no-loss tier clear, and speed goals. Three pinnable showcase badges on the Stats page. Needs L1 and L2.
- **L4: weekly challenge.** A seeded modifier-of-the-week match (for example "every square is a Hazard") reusing the daily plumbing, with a best-score board on the device and a shard reward. Needs L2.
- **L5: modifiers and handicaps.** Opt-in toggles on Skirmish: fog of war, an AI head start, capture timers, sudden death at a set round. Each carries a shard multiplier that is shown before the match. Needs L2.
- **L6: ranked ladder.** An Elo-style rating per player, played against the AI personas. The next suggested opponent keeps matches close; the rating and a rank title show on Stats. Local only (online ranked is out of scope).
- **L7: Gauntlet ascension.** Extends the existing Gauntlet: ascension levels (each adds a harder rule or foe buff once the run is won), a daily seeded run, more perks and relics, and a run summary with a share code.
- **L8: editor and share codes.** A board editor (blocked squares, beacons, cell effects, starting pieces) and a puzzle editor, with a "test it" step, exported through `share.ts` as a code or link. Imported boards are validated and play like any other match.
- **L9: juice.** Capture and win animations, a combo or streak counter, screen shake tied to the reduce-motion setting, and reactive music layers in `audio/synth.ts` that build toward the Eclipse.
- **L10: onboarding.** A guided first battle with contextual prompts (building on `tips.ts` and the tutorial), a first-session path through the menu, and a gentle difficulty suggestion after early losses.
- **L11: shareable replays.** A share card image drawn on a canvas (final position, result, rule tags), an auto-playing replay link, and a short animated clip if it can be done without a dependency. Needs L1.
- **L12: async play-by-link.** Play a game by passing a link back and forth, one move at a time, using the existing action-log encoding. Each link carries the whole record, so no server is needed; the app checks that the pasted record extends the one it holds.

## L1 file map
- `src/ai/strategy.ts`: `judgeMove(state, played, difficulty)` returns the best action, its value, and the played action's value (same search, no noise, duel outcomes averaged).
- `src/ai/review.ts` (+ test): `classify`, `reviewGame(record, difficulty, onProgress)`, `summarise`; plain data out (`MoveReview[]`).
- `src/ai/worker.ts`, `src/ai/client.ts`: a `review` request that streams one result per position.
- `src/ui/menus/Replay.tsx`: Review button, evaluation bar, key-moment navigation, better-move display.
- `src/index.css`: styles for the bar and badges.

## L2 file map
- `src/engine/data/cosmetics.ts`: the catalog (themes, piece sets, capture effects, sound packs, codex frames), voices and capture effects.
- `src/shop.ts` (+ test): wallet store `eclipse-court:shop`, `buy`, `equip`, `shardsForGame` and the fixed rewards (puzzle, daily puzzle, gauntlet stage and run).
- `src/cosmetics.ts`: applies equipped piece set, codex frame and sound voice. Paid themes are in `settings.ts` with a `cost`; the Collection sets them through the settings.
- `src/ui/menus/Collection.tsx`, reached from the main menu's utility row. Capture bursts are drawn in `ui/board/Board.tsx`; styles in `index.css`.
- Not yet: weekly-play Shards (arrive with L4) and mastery payouts (L3).
