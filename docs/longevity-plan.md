# Longevity plan: depth, rewards and reach

Status: **phases 1-2 done.** Written 2026-10-28 from the full-game review. Each phase is one commit; stop after each so the context can be cleared. Do not start the next phase until asked.

## Ground rules

- Engine rules (`src/engine/rules`) do not change unless a phase says so; if one does, run `npm run modes`, `npm run courts` and `npm run styles` before and after and note the win rates in the commit.
- New text goes through `t()` in `src/i18n/en.ts`. New state lives in its own `eclipse-court:*` localStorage key, parsed safely (`parseX(raw)` pattern as in `shop.ts`), included in backups, with a test.
- Every new effect respects `reduceMotion` and `flashesReduced`; new aids follow the play-aids fairness rules (hidden in scored games).
- Pure rules go in small tested modules; drawing stays in components.
- Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). Commit and stop.

## Part A: Foundations (quality of life)

### Phase 1: Accessibility quick wins
Items 1-3 of `docs/accessibility-plan.md` phase 1.
- Allow pinch zoom: drop `user-scalable=no` from the viewport meta. Read the CSS for fixed heights or `overflow: hidden` that would break at 200%.
- Board focus: keep `svg.board:focus { outline: none }` only because the cursor is drawn; make `.kb-cursor` high contrast in every theme and add a visible focus ring on the board frame when focused.
- Lint: turn on oxlint's `jsx-a11y` plugin in `.oxlintrc.json` and fix what it reports (no new dependency).

### Phase 2: Rematch and Goals hub
- A **Play Again** button on the game-over dialog for skirmish, practice and hot-seat that restarts with the same setup and a new seed (swap sides optional). Not shown for daily, weekly, ladder, campaign, puzzle, online.
- A **Goals** screen (linked from Stats and the main menu's Suggested card) that lists, in one place, the closest-to-complete items from mastery tracks, piece goals, achievements and bounties, with a progress bar and a button to the screen that advances each. A pure `goals.ts` model builds the list; tested.

### Phase 3: Balance guard
- Turn the sim scripts into a fast test: a seeded, small batch (`src/sim`) per mode and per court that fails if a court's win rate or a play style's score leaves a band (about 40-60%). Keep it under a few seconds; the full scripts stay for deep runs.
- Document the bands and how to rerun the full scripts in this plan's Status.

## Part B: Economy and return reasons

### Phase 4: Shard sinks
- Gauntlet **reroll token** (reroll one reward offer, costs Shards, limited per run).
- Daily **streak freeze** (protects one missed day, bought, max 2 held).
- **Extra hint** packs for puzzles (the free hint count is unchanged).
- **Prestige tiers** for owned cosmetics (cost rises, adds a small animated flourish; data on the cosmetic).
- A `sinks.ts` store and a Collection section; prices tuned so the average earner reaches each tier in a few weeks.

### Phase 5: Quests
- Three daily and three weekly quests across all modes ("win a duel in the dark", "solve 3 puzzles", "clear a Gauntlet stage"), each with one reroll per day. Seeded by date (`dailySeed`) so they are the same offline.
- Progress is counted from the existing `Summary` and puzzle/Gauntlet events; claimed rewards pay Shards and season XP (phase 6).
- Shown on the main menu's Today section and on the Goals hub.

### Phase 6: Season track
- A month-long 30-tier reward track filled by XP from games, puzzles, quests and Gauntlet stages. Rewards: Shards, cosmetics, persona-card flourishes and a final season banner.
- Season boundaries come from the calendar (like `events.ts`); the finished track is kept in a history fold.
- Local only: state in `eclipse-court:season`, backed up with the rest.

## Part C: Gauntlet depth

### Phase 7: More relics and event nodes
- Grow `RELICS` from 6 to about 20, with a few that interact (for example one that rewards casting, one that rewards holding beacons), unlocked on the existing `RELIC_UNLOCK_WINS` curve and by ascension clears.
- Add **event** rewards: a choice screen with risk and reward (sacrifice a piece for a relic, trade max HP for a spell). New `Reward` kinds in `gauntlet.ts`; tests for every outcome.

### Phase 8: Branching map
- Replace the linear 8 stages with a layered map: each step offers two or three nodes (fight, elite, event, rest, boss). A pure `gauntletMap.ts` builds the map from the run seed; run codes still reproduce a run.
- Elite nodes are harder and pay more; the final node is a boss drawn from the ladder bosses. `Run` gains a `path`; old saved runs are discarded or finished on the old rules (`RUN_VERSION` bump with a parse test).

### Phase 9: Heat and endless
- A **heat** list beside the fixed ascensions: the player picks penalties (for example fewer spells, hardened elites) that raise a heat score and the reward multiplier.
- **Endless** after the final boss: stages keep scaling through `stageFoe` with a depth record and a share code.

## Part D: Characters and story

### Phase 10: Persona memory
- Record the head-to-head result against each persona (`personaRecord` store). Greetings, briefings and result lines choose a variant by record (first meeting, you lead, they lead, rematch after a loss).
- Add the extra line categories to `personaLines` with the existing "no repeats, at least N per category" test.

### Phase 11: Grudge matches and mini-arcs
- A short arc per persona (three fights with a signature army or rule each) unlocked by beating them, with a Shard prize and a cosmetic at the end. Data in a new `personaArcs.ts`; fights run through the existing scenario/ladder machinery.
- A **Grudge match** button on the result screen after a loss to a persona.

### Phase 12: Story epilogues
- A short epilogue chapter for each of the three endings, readable from the Story screen once that ending is chosen, with a small lasting change (menu sky variant or a cosmetic). Reuse the chapter reader and `endings` set; tests that every ending has one.

## Part E: Social play without a server

### Phase 13: Ghost challenge
- A code that encodes your daily or weekly result and its game record; a friend plays the same game and sees both scores side by side. Built on `shareCard`, `share.ts` and `challenge.ts`; accepted on the Paste a Code screen.

### Phase 14: Tournaments
- **Hot-seat tournament** for 4 to 8 local players with an auto bracket, pass screens between games and a final winner card.
- **Persona tournament** for solo play: an 8-opponent bracket of the personas, with a Shard prize and a trophy record on Stats.

### Phase 15: Puzzle packs
- Export several editor puzzles as one pack code or URL; import checks every puzzle is solvable (the existing check), then lists the pack on the Puzzles screen with its own progress.

## Part F: Variety and shareability

### Phase 16: Layouts and rule seasons
- A **randomized layout** option in Skirmish setup (a mirrored shuffle of the army within legal squares, seeded, checked by the existing setup validation).
- A **featured ruleset** each month (a mode plus a twist) applied to the daily, weekly and ladder games as the season theme; named on those screens.

### Phase 17: Highlights reel
- A "Game of the Week" built from `moments.ts` and the replay data: the best finished game of the last seven days, with a Watch button and a share link. Pure selection model, tested.

## Part G: Reach and code health

### Phase 18: Localization
- Finish moving the remaining screens (Skirmish setup, Gauntlet, Campaign, Story, Stats, Ladder, Lobby, Editor, Replay, game screen, trays, duel, tutorial, tips) and the engine's name and blurb strings behind `t()`.
- Add a language setting that calls `setLocale`; a test that every key used exists in `en.ts`.

### Phase 19: Split the big files
- Break `Game.tsx` and `App.tsx` into per-concern modules (screen routing, game session, result handling) with no behaviour change; the existing tests are the guard.

### Phase 20: Remaining accessibility
- Phases 2-5 of `docs/accessibility-plan.md`: keyboard and focus, time and announcements, contrast script, statement. Each sub-phase is its own commit.

## Suggested order

1 first (cheap, a real WCAG gap), then 4-6 (the return loop), 7-9 (the Gauntlet), 10-12 (characters), 13-15 (social), then the rest. Phases 2 and 3 can move earlier if balance or goal clarity becomes the bottleneck.

## Status

Phase 1 done: pinch zoom is allowed (`user-scalable=no` removed from the viewport meta; the CSS uses rem and `dvh`-free sizing with no fixed pixel heights that clip, only the piece card's rem-based ellipsis, but 200% zoom was read, not run). The board shows a gold focus ring on its frame when focused by keyboard, and the keyboard cursor has a dark halo so it reads on pale squares in every theme. oxlint now runs the `jsx-a11y` plugin with `prefer-tag-over-role` off (`role="status"` and `role="dialog"` are fine here), `aria-role` ignoring non-DOM components (the `role` prop on `PieceArt`) and `label-has-associated-control` at depth 3. Fixed: the setup switch gets `aria-checked`, the moment toast uses `aria-live` instead of a role on a button. Kept with a reasoned `oxlint-disable-next-line`: pointer-only click shortcuts on the kill cam, story stage and replay eval bar (each has a keyboard route), and `autoFocus` on the modal tip and coach card until the shared dialog hook in accessibility phase 2.

Phase 2 done: the game-over dialog offers **Play Again** (and **Swap Sides** against the AI) for skirmishes and hot-seat games started from the setup screen; the screen carries the setup (`again`) so it is dealt again with a new seed and a re-rolled persona. Daily, weekly, ladder, campaign, scenario, co-op, puzzle, story, Gauntlet, editor, link and online games do not show it, nor do resumed saves (their setup is not kept). The Practice screen is a duel trainer with its own loop and has no game-over dialog, so it is left as is. The **Goals** screen (`src/goals.ts`, `src/ui/menus/Goals.tsx`, linked from Stats and the main menu's Suggested card) lists up to ten open goals, three at most per source: mastery levels, piece goals, the next "earn N achievements" badge and today's unclaimed bounties. Claimable goals come first, the rest by nearness; each has a button to the screen that advances it, and claims still happen in Stats. Achievements in general have no partial progress, so only the badge-count ones appear.
