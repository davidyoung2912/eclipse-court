# Game modes plan

One phase per idea, in priority order. Each phase ends with a commit and a stop (see CLAUDE.md). Verify every phase with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing.

Findings that shape the plans:

- `Game.tsx` hard-codes "one human, one AI" (`human`, `foe`, `myTurn`), and `App.tsx`'s `Screen` type, `saved.ts` and `progress.ts` all assume it too.
- Live duels are a real-time minigame where the player steers one fighter. That is the main hurdle for hot-seat and timed play.
- `encodeRecord`/`decodeRecord` already turn a game into a shareable text code, and Skirmish setup already has a `daily` mode (board and army seeded by date). That makes phases 2 and 4 smaller than they look.

---

## Phase 1: Hot-seat 2-player

**Goal:** two people on one device, either court.

**Refactor first.** Replace `human: Court` and `difficulty` in `Game` with a per-court controller, `controllers: Record<Court, 'human' | { ai: Difficulty; personality? }>`. Then:

- `myTurn` becomes "the current court is human".
- The AI effect runs for whichever court is AI-controlled.
- `flip` follows the court whose turn it is, or stays fixed. That is a setting, so players don't have to rotate the device.
- The existing one-human case is `controllers = { [human]: 'human', [foe]: { ai } }`, so nothing else changes.

**Hot-seat specifics:**

- **Pass-device screen.** A "Hand to Umbral / Tap to reveal" interstitial replaces the turn banner. There is no hidden information in this game, so it is optional, and a setting can turn it off.
- **Hints and undo.** Hint is disabled in hot-seat, or runs for the current court. Undo steps back one move.
- **Duels** need a decision; offer both:
  - **Auto-duel** (default for hot-seat): both fighters use the duel AI at equal skill. Cheapest option.
  - **Split-screen live duel:** `DuelView` takes two touch zones, one per fighter, with the top half mirrored. The sim already takes a `DuelInput` per fighter, so this is mostly UI. It is the riskiest piece: ship auto-duel first and add split-screen if it feels worth it.
- **Scope of the match.** Skirmish setup gets an "Opponent: AI / Local player" toggle that reuses all existing modes, boards and modifiers. Difficulty is hidden for Local.
- **Persistence and stats.** The saved game gets a `controllers` field, with a migration for old saves. Hot-seat games don't count toward campaign, stars or difficulty stats. They get their own "versus games played" counter, or none.
- **Tests.** Reducer behaviour is unchanged. Add a test for the controller helpers and for save round-tripping.

## Phase 2: Shareable matches and challenge links

**Goal:** send a friend "this exact setup and seed", or a finished game to replay.

- **Links.** Add `#c=<code>` and `#r=<code>` hash routes. `serialize.ts` already produces a versioned code, so this reuses `FORMAT_VERSION` and its clean refusal of bad codes. The challenge code is a `MatchConfig` plus a side, with no actions.
- **Entry point.** On load, `App` parses the hash. A challenge goes to a "Challenge from a friend" screen that shows the config summary, with a side choice and a "Play" button (AI or hot-seat). A replay code opens the existing Replay viewer.
- **Sharing UI.** "Copy challenge link" on the Skirmish setup screen. "Copy replay link" on Stats and on the game-over dialog, using `navigator.share` where it exists, else clipboard. Also a "Paste code" field in the menu for people who can't use links.
- **Validation.** `decodeRecord` already returns null for bad input. Add range clamps on config numbers from a link, so a hostile link can't create a 10,000-round game.
- **Tests.** Round trip for the challenge code, rejection of garbage, and an old-version code.

This also makes async play possible: A plays a hot-seat challenge and sends the replay, and B replays it and answers.

## Phase 3: Roguelike gauntlet

**Goal:** a run of matches with a persistent army, ending when you lose.

**Data model.** `Run` is `{ seed, stage, army: RunPiece[], spells, gold/picks, relics }`, saved under its own localStorage key with a version, not inside `Progress`. `RunPiece` carries role, max HP bonus and perks, using the existing growth fields (veteran, elite perk).

**Flow:**

1. Start a run: pick a court and a starter army from the draft budget.
2. A fight is a normal `Game`, built with `matchConfig`, `growth: true` and the persistent army as the `layout`. The opponent is generated from the stage number with a scaling AI difficulty, a personality chosen by seed, and a modifier (day events, board, win mode) drawn from the existing ones.
3. After a win, a reward screen. Pick one of three offers: a new piece (within a cap), a +1 HP upgrade, an elite perk for a surviving piece, a spell added to the loadout, or a relic.
4. Surviving pieces keep their veterancy; fallen ones are lost unless a rest stop revives one.
5. A loss ends the run. Beat a boss at stage 8 for a victory.

**Engine seam.** `Game`'s `onExit` already hands back the final record, so the run reads the surviving pieces out of the final `GameState`. A pure `runReward(run, rng)` function and an `applyReward` function keep it testable.

**Relics.** Keep them to a few that map onto existing `MatchConfig` flags (passives, recharge, a longer day), so there are no new engine rules at first.

**Progress.** Best stage reached, runs won, and one or two achievements go into `Progress` (bump `PROGRESS_VERSION` with a migration).

**Tests.** Stage generator determinism, reward application, and a soak test (the repo has `sim/soak.test.ts`) that plays AI-vs-AI runs to check nothing deadlocks.

## Phase 4: Daily challenge match

**Goal:** the same fixed match for everyone each day, with a result you can compare.

- **Config.** The existing `daily` setup already seeds board and army from `dailySeed()`. Extend it so the seed also picks a win mode, a modifier combo (events, showdown, reverse, cycle) and a fixed AI difficulty and personality, all through `rngNext`. Keep a short text blurb on the menu ("Today: Hill · Fog · Reverse light").
- **One scored attempt per day.** Progress gets `daily: { date, result, turns, lost }`. The score is a plain tuple: won/lost, then turns taken, then pieces lost. No server, no leaderboard.
- **Comparison.** Reuse phase 2: "Share result" copies a text card (date, win/loss, turns) plus a replay link, and friends can try the same seed.
- **Streak.** The day-streak counter and a streak achievement go in `Progress`.
- **Menu.** A "Daily" card on the main menu, with the puzzle and the match side by side.
- **Tests.** Same date gives the same config, different dates differ, and the streak edge cases (a missed day, a timezone change). Use an injectable date, as `dailySeed(date)` already does.

## Phase 5: Asymmetric scenarios

**Goal:** a new campaign chapter of hand-built situations with their own objectives.

- **Data.** Put them in `engine/data/scenarios.ts`, using the same shape as `Opponent` in `campaign.ts` and `puzzles.ts` (a `setup` function and `rules`). Add `objective` and `turnLimit` fields.
- **Objectives** that need small engine additions:
  - **Survive N rounds.** The existing `roundLimit` plus a custom winner rule.
  - **Escort the Leader to a square.** A `goal: Pos` on the config, checked in the reducer's win logic.
  - **Hold a beacon for N rounds.** Resembles Hill and Score, so reuse their win code.
  - **Handicaps.** Free, since `setup` can already rewrite HP and pieces.
- **Win check.** Keep `MatchMode` for standard games and add a `scenario` objective only when needed. The reducer change is the one real engine edit here, so cover each new objective with tests in the style of `modes.test.ts`.
- **UI.** A "Scenarios" tab on the Campaign screen, with stars like the campaign and the objective shown in the Game status line.
- **Progress.** Stars per scenario, with a new array and a migration.
- **Content.** Aim for six to eight at launch. This is mostly design work.

## Phase 6: Blitz / timed turns

**Goal:** a per-turn clock that makes the game quick and tense.

- **Config.** `turnClock?: { seconds: number; bank?: number }` on `MatchConfig`. It is a rule, so it belongs in the saved config and in replays.
- **Where it lives.** The clock runs in the UI layer, not the reducer, because the reducer must stay pure. On expiry the UI plays `{ type: 'pass' }`; since a pass is already a recorded action, replays stay deterministic.
- **Duel interaction.** The clock pauses during duels, which are timed anyway at 20 seconds. This makes live duels a fit for Blitz. In hot-seat, duels stay auto unless split-screen exists.
- **UI.** A countdown ring around the Dial or the tray, pulsing in the last 5 seconds, plus a sound cue. Honour the accessibility settings and add an "extra time" option.
- **AI.** No change, since the AI is instant. Consider adding a short think delay so it doesn't look broken.
- **Modes.** Blitz combined with Hill or Score is the intended pairing. Add presets in the Skirmish setup.
- **Tests.** A pure `clock` helper (remaining time given timestamps) is unit-testable. Use a fake timer for the pass-on-expiry path.

## Phase 7: Curated mutator presets

**Goal:** named bundles that make the existing depth discoverable. This goes last because it can use everything from the earlier phases.

- **Data.** `PRESETS` in `setups.ts`, each a `Partial<SetupChoice>` with a name, an icon, a one-line text and a difficulty rating. Examples: **Long Night** (long cycle, fog, showdown), **Veteran's War** (growth, promotion, recharge), **Sudden Sun** (reverse light, swift cycle, Hill), **Blitz Hill** (phase 6).
- **UI.** A preset strip at the top of Skirmish setup. Picking one fills the toggles, and the player can still tweak afterward, with the preset marked "customised" once they do. It also feeds the daily generator and the gauntlet's modifier pool, so they share one source of truth.
- **Unlocks.** Gate a few presets on stars, using the existing `boardUnlocked` pattern.
- **Tests.** Every preset produces a valid config and finishes a soak-test game.

---

## Cross-cutting

- **Save compatibility.** Phases 1, 3, 4 and 5 each touch `Progress` or `Saved`. The versioned load must migrate old saves, and each phase should add a test with a v-previous fixture.
- **Order dependencies.** Phase 1 (controllers) is needed by 2 and 6. Phase 7 should come after 3, 4 and 6, so presets can feed the gauntlet and daily generators.
- **Biggest risks:**
  - The `Game.tsx` refactor in phase 1, because it is the core screen and has the most intertwined state.
  - Split-screen duels, which are optional.
  - The new objective types in phase 5, which are the only real change to engine rules.
