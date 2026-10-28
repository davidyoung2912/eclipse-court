# Longevity and engagement: twelve additions

**Status: L1 to L12 done; the plan is complete.** Each phase ends with a commit and a stop (see CLAUDE.md). Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing.

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
- **L3 (done): mastery and achievements.** Per-area mastery tracks (Campaign, Scenarios, Puzzles, Gauntlet, Grand board, Online) with levels that pay Shards. About 25 new achievements, including review-based ones ("a game with no mistakes"), a no-loss tier clear, and speed goals. Three pinnable showcase badges on the Stats page. Needs L1 and L2.
- **L4 (done): weekly challenge.** A seeded modifier-of-the-week match (for example "every square is a Hazard") reusing the daily plumbing, with a best-score board on the device and a shard reward. Needs L2.
- **L5 (done): modifiers and handicaps.** Opt-in toggles on Skirmish: fog of war, an AI head start, capture timers, sudden death at a set round. Each carries a shard multiplier that is shown before the match. Needs L2.
- **L6 (done): ranked ladder.** An Elo-style rating per player, played against the AI personas. The next suggested opponent keeps matches close; the rating and a rank title show on Stats. Local only (online ranked is out of scope).
- **L7 (done): Gauntlet ascension.** Extends the existing Gauntlet: ascension levels (each adds a harder rule or foe buff once the run is won), a daily seeded run, more perks and relics, and a run summary with a share code.
- **L8 (done): editor and share codes.** A board editor (blocked squares, beacons, cell effects, starting pieces) and a puzzle editor, with a "test it" step, exported through `share.ts` as a code or link. Imported boards are validated and play like any other match.
- **L9 (done): juice.** Capture and win animations, a combo or streak counter, screen shake tied to the reduce-motion setting, and reactive music layers in `audio/synth.ts` that build toward the Eclipse.
- **L10 (done): onboarding.** A guided first battle with contextual prompts (building on `tips.ts` and the tutorial), a first-session path through the menu, and a gentle difficulty suggestion after early losses.
- **L11 (done): shareable replays.** A share card image drawn on a canvas (final position, result, rule tags), an auto-playing replay link, and a short animated clip if it can be done without a dependency. Needs L1.
- **L12 (done): async play-by-link.** Play a game by passing a link back and forth, one move at a time, using the existing action-log encoding. Each link carries the whole record, so no server is needed; the app checks that the pasted record extends the one it holds.

## L12 file map
- `src/mail.ts` (+ test): store `eclipse-court:mail` (up to 20 games: id from the opening position, the court this device plays, the record code). `receive(held, incoming)` says whether a pasted record is new, an update (extends the held moves), known (same or shorter) or a clash (another game, or the moves diverge); `statusOf`, `toMove`.
- `share.ts`: `#g=` links (`turnLink`) carry the whole record and parse as `kind: 'turn'`; a bare code still opens as a replay.
- `ui/menus/Mail.tsx` (list, New Game, paste box, accept card), `MailSend.tsx` (the link to send). Battle menu has Play by Link; Skirmish setup takes `byLink`.
- `Game.tsx` `mail` prop: no AI answers, duels are settled automatically, no undo, and the move ends the visit. A new game opens as the creator's court; the court to move when a new link arrives is the receiver's. No server, no other saved state.

## L11 file map
- `src/shareCard.ts` (+ test): `cardModel` (headline, detail, rule tags; pure), `drawCard` (canvas drawing of the final position with light shading, beacons, cells and piece letters), `cardImage` (PNG blob), `cardClip` (WebM recorded from a canvas with `MediaRecorder`, positions from `clipFrames`, only where `canRecordClip()`). `src/saveFile.ts` downloads a blob.
- `Replay.tsx`: Save Card and Save Clip buttons; `autoplay` prop, set in `App.tsx` for replays opened from a link or pasted code. No new saved state.

## L10 file map
- `src/onboarding.ts` (+ test): store `eclipse-court:onboarding` (last six AI games, a total, when advice was dismissed, checklist hidden). `adviceFor` suggests one level easier after two losses in a row at the same difficulty (not on Easy; hidden until another game is played). `checklist`/`showChecklist` (five first steps), `isFirstBattle`, `coachLine` (prompt chosen from the board and selection).
- `Game.tsx` `coach` prop shows the coaching line in campaign battle 1 until it is cleared (not in tournaments); `App.tsx` records games where the player picked the difficulty (not ladder, daily or weekly) and adds the advice to the report; `MainMenu.tsx` shows the advice card and a First steps list once the tutorial is done. Settings "Show Tips Again" also resets this.

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

## L3 file map
- `src/mastery.ts` (+ test): store `eclipse-court:mastery` (paid levels, three showcase pins, the side taken in the last game). Six tracks score points from `Progress`; eight levels (`LEVEL_POINTS`) pay `20 x level` Shards, claimed from Stats with `claimMastery`.
- `src/progress.ts`: 25 new achievements (100 to 125), including the new `Insight` category fed by `recordReview`; `Summary.review` carries the result of a review.
- `src/ui/menus/Replay.tsx`: `onReviewed` fires when a review of the player's own last game finishes (App passes it only for "Replay Last Game") and the earned lines show under the summary.
- `src/ui/menus/Stats.tsx`: Showcase, Mastery section with Claim button, Pin buttons on earned achievements.

## L4 file map
- `src/engine/data/weekly.ts`: `WEEKLY_MODIFIERS` (eight twists, five of them a cell effect over the middle band), `weeklyMatch(date)` (week = Monday's `dailySeed`; seeded random army, persona and difficulty), `isWeeklyMatch`, `weeklyScore` (win 500 plus speed and pieces kept).
- `src/weekly.ts` (+ test in `weekly.test.ts`): store `eclipse-court:weekly` with the week's best, attempts, weeks won and recent history; `recordWeekly` pays 40 Shards for a week's first win and 10 for each better winning score.
- `src/ui/menus/Weekly.tsx`, a "Weekly" button in the main menu's Today row, wiring in `App.tsx` (`finishGame` records the score; weekly games are not counted as daily).

## L5 file map
- `src/engine/rules/types.ts`: `MatchConfig.fog`, `suddenDeath` (a round) and `edge` (`{ court, hp }`), all optional and off by default; validated in `serialize.ts` and listed by `describeConfig` in `share.ts`.
- `src/engine/reducer.ts`: `newGame` applies `edge` (extra HP on every piece of that court); `applyMove` ends the game on a one-sided kill from the sudden-death round on. Fog is display only: the AI still sees everything.
- `src/engine/data/modifiers.ts` (+ test): `visibleTo`, `FOG_SIGHT`, the choices, and `shardMultiplier(config, human)` (fog +25%, sudden death +10%, +20% per head-start HP against the human, and +15/10/5% for a 15 s / 30 s / longer turn clock). `shardsForGame` takes the multiplier for the game part, not for achievements.
- `src/engine/data/setups.ts`: `SetupChoice.fog / suddenDeath / headStart`. `SkirmishSetup.tsx` has a Twists section; `Board` takes `fogFor`, passed by `Game` only against the AI. The capture timer is the existing turn clock.

## L6 file map
- `src/engine/data/ladder.ts`: `LADDER_FOES` (5 personas x 3 difficulties, rated 770 to 1430), Elo maths (`expectedScore`, `kFactor` 40 for the first ten games then 24, `nextRating`), `RANKS`/`rankOf`, `suggestFoe`, `ladderConfig` (seeded random army, classic board, Solari).
- `src/ladder.ts` (+ `ladder.test.ts`): store `eclipse-court:ladder` (rating from 1000, peak, record, last ten games); `recordLadder` pays 5 Shards per win and 30 for each new rank reached.
- `src/ui/menus/Ladder.tsx`, reached from Battle; `App.tsx` game screen has `ladder` (foe id), non-resumable, rated in `finishGame` (abandoned games change nothing). Stats shows the rating tile once a game is played.

## L7 file map
- `src/engine/data/gauntlet.ts`: `ASCENSIONS` (five cumulative levels: +1 foe HP, no camps, foes one difficulty higher, one extra rule per stage, boss Eclipse at round 14), `stageFoe(seed, stage, ascension)`, `restStages`, relics `sundial` (passives) and `omen` (day events), `runCode`/`parseRunCode` (`G<level>-<seed base 36>`) and `runSummary`. `Run` gains `ascension` and `daily` (old saves read as 0).
- `src/ascension.ts` (+ test): store `eclipse-court:ascension` with the unlocked level (a win at the top level opens the next), the daily run's day record and days won; Shards: 20 x level for an ascension win, 30 for a day's first daily-run win.
- `src/ui/menus/Gauntlet.tsx`: ascension picker, Daily Run button (seed = `dailySeed`, Solari, classic army), run-code field, and a copyable summary after a run. `App.tsx` `closeRun` settles records and Shards.
- Not done: new perks (the perk system lives in the engine; left alone to avoid balance changes).

## L8 file map
- `src/engine/data/editor.ts` (+ test): `Design` (size, beacons, walls, cells, both armies, mirror flag, goal), `applyTool`, `setMirror`, `resize`, `problems` (one Leader a side, no piece on a wall, goal square rules), `designConfig`/`designChallenge` (config marked `board: 'custom'`, `setup: 'custom'`), `designFromConfig` (opens a shared board for editing) and `parseDesign`. Goals are the three match modes plus the puzzle objectives Survive, Escort and Hold, which are Solari's.
- `src/editor.ts`: draft store `eclipse-court:editor`, held in memory too.
- `src/ui/menus/Editor.tsx`, reached from Battle: tools, board, goal, problems list, Test It, Copy Challenge Link and a code box. Sharing reuses `encodeChallenge`, so no new format and no `FORMAT_VERSION` bump; `describeConfig` calls such boards "Custom".
- `src/App.tsx`: `editor` screen; a game with `editor: true` or a custom board is transient and unscored (no stats, Shards or saved game), and Back from an editor test returns to the editor. A challenge for a custom board offers "Open in the Editor".

## L9 file map
- `src/juice.ts` (+ `juice.test.ts`): pure rules. `streakAfter(steps)` counts a court's consecutive capturing turns, `streakLabel` names runs of two or more, `shakeFor(lost, leaderFell, reduceMotion)` gives the board shake (none when motion is reduced), `musicLevel(state)` runs 0 to 0.9 through the day and 1 at the Eclipse.
- `src/audio/synth.ts`: `startMusic()` is a drone, a fifth, a breathing shimmer and a pulse from the halfway mark, driven by `setLevel`; `isMusicOn`/`setMusicOn` (key `eclipse-court:music`, on by default, heard only while sound is on); new `sfx.streak` and `sfx.eclipse`.
- `src/Game.tsx`: `celebrate` (shake via the Web Animations API on `.board`, streak sound and the `.combo` label), music effects, the Music checkbox beside Sound, the Eclipse sting, and `WinBurst` (`ui/tray/WinBurst.tsx`) in the result dialog on a win. Styles at the end of `index.css`; reduced motion hides the burst and the shake never runs.
