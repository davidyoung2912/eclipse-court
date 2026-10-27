# Eclipse Court: Expansion Plan

Goal: make the game more varied, replayable and worth owning, without adding a backend service.
This document records the review of the current rules, the recommendations, the browser-only multiplayer design, and a phased execution plan.

Status: proposal for review. No code has changed. Phases below are numbered E1–E8 so they do not collide with the original build phases 0–6. As in `CLAUDE.md`, each phase ends with a commit and a stop; verification is `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build` only (no browser testing).

---

## 1. Where the game stands

A 7×7 board game with an unusual hook: a rippling light cycle (an 8-step "day", −2 to +2) changes which court is stronger on each square, and attacks resolve in a real-time arcade duel.

| Area | Today |
|---|---|
| Board | 7×7, five beacons (centre, top/bottom middles cycle; home-edge middles are fixed) |
| Pieces | 12 per court, 7 roles, identical mirrored layout (`engine/data/roster.ts`) |
| Win | Hold all 5 beacons at end of your turn, or eliminate the enemy; Eclipse at round 30; adjudication at round 50 |
| Spells | 7, shared by both courts, one use each per game, cost the Leader 1 HP and the whole turn; none work after Eclipse |
| Duels | Real-time, fixed-tick (`DT`) sim with per-role styles; light modifies damage dealt/taken |
| Modes | Tutorial, Skirmish (choose court and 3 difficulties), Campaign (8 stat-tweaked opponents, progress in `localStorage`) |
| Extras | Hint button, odds card, AI search (depth 1–3), balance simulator (`src/sim`) |
| Missing | Any two-human mode, army or setup choice, progression, rewards, variety of win conditions |

Strength: the pure, deterministic reducer (`engine/reducer.ts`) and framework-free engine make nearly every recommendation below cheap to test.
Weakness: every game starts identically, the two courts differ only inside duels, and the strategic layer has no surprise.

## 2. Recommendations (from the review)

### 2.1 Biggest gaps, in priority order

1. **Every game starts identically.** Add an army draft with a point budget, optional randomised mirrored setups, board variants (beacon layouts, blocked squares) and a daily seed.
2. **The two courts feel the same at the strategic layer.** Give each court signature spells and light-tied passives instead of one shared spell book.
3. **Spells are a one-shot checklist.** Let players pick a loadout of 3–4 spells from a pool of 10–14, add new spells, and consider recharging spells.
4. **Pieces have no growth or choice.** Add veterancy, promotion and draft-time perks.
5. **No hidden information or surprise.** Add day events or modifiers, variable cycle length/direction, and beacon effects.
6. **Narrow win conditions.** Offer match modes: Beacons (classic), Leader Capture, Score Race, King of the Hill.

### 2.2 Content and modes

- **Campaign:** AI personalities (rusher, turtle, spell-heavy, beacon-grabber), distinct setups and flavour, unlockable rewards, star ratings, a boss with a unique rule.
- **Multiplayer:** hotseat, play-by-link, live peer-to-peer (section 3).
- **Duels:** light-dependent arena hazards, role-specific abilities, a practice arena.
- **Meta:** stats, achievements, replays, puzzles/scenarios (the hand-built `tutorialStart` shows the pipeline exists), undo in casual play, Ironman mode, handicaps, cosmetics.

### 2.3 Balance and pacing risks to verify

- `ROUND_LIMIT` exists because beacon-sitters out-heal pressure and are immune to Eclipse attrition (soak tests saw games past round 200). The cap is a patch. A better design: the Eclipse also shrinks the playable board or darkens the outer ring, so the endgame is a showdown instead of a timer.
- Healing stacks (+1 resting every 2 rounds, +1 beacon, +1 next to an Aura). Check it is not enabling stalls.
- Role value spread (Bruiser 10 HP vs Footsoldier 4): confirm cheap pieces still matter late.
- First-move advantage: Solari moves first. Measure with the sim; consider a pie rule (second player may swap sides) for human-vs-human games.

### 2.4 Top five if only five things ship

1. Army draft plus random setups.
2. Local hotseat plus browser-only online play.
3. Distinct court identities and a choose-your-spells loadout.
4. A campaign with real AI personalities, rewards and star ratings.
5. Daily puzzle and daily seed.

---

## 3. Browser-only multiplayer design (no backend)

### 3.1 Options considered

| Option | Backend? | Works for | Verdict |
|---|---|---|---|
| **Play-by-link** (game state in the URL) | None | Async, any time zone, any chat app | **Primary online mode** |
| **WebRTC with copy-paste/QR handshake** | None (public STUN only) | Live, simultaneous | **Optional second mode** |
| WebRTC with a signalling library (e.g. Trystero, PeerJS cloud) | Third-party relays/brokers | Live, one-click invite | Possible later upgrade; adds a dependency we do not control |
| Real server (WebSocket/Firebase) | Yes | Everything | Out of scope |

### 3.2 Play-by-link

The game is `seed + setup + ordered action list`. Everything else is derived by replaying through `reduce`.

- Encode as a compact payload: version byte, setup descriptor (mode, draft, loadouts, board), then actions in a few bits each; compress (`CompressionStream` is built in, no dependency) and base64url into `#g=...`. A typical full game should stay under a few KB.
- After your turn the UI shows "Send this link to your opponent" with Copy, Share (Web Share API where available) and QR code buttons. Opening a link restores the game and shows whose turn it is. If it is the opener's turn, they play; otherwise it shows a waiting screen with the latest link.
- Integrity: friends-only trust model. The state is replayed through the reducer, so illegal moves are rejected by construction. Duel outcomes are the only trusted input (3.4).
- Each player's browser also stores the game in `localStorage` under a game id so a refresh or a returning link never loses progress. Both players always hold the full log, so any link continues the game.
- Conflict handling: every payload contains the action count. A link with fewer actions than local state is stale and ignored with a message.

### 3.3 Live play (WebRTC)

- Host taps **Invite**: the app creates an `RTCPeerConnection`, gathers ICE, and encodes the offer into a link and QR code. The guest opens it, the app produces an answer (a second link/QR/code), and the guest sends it back to the host who pastes or scans it. Then the data channel opens.
- STUN only (public servers). Roughly 10–15% of network pairs (strict NAT/mobile carriers) will fail to connect; there is no reliable free TURN. The UI says so plainly and offers play-by-link as the fallback with one tap.
- Messages: `action` (a game action, validated by the receiver through `reduce`), `duel-input`, `hello`/version, `resync` (send full action log), `chat-emote` (optional).
- Reconnect: if the channel drops, both sides keep state and use `resync` after a new handshake; the action log makes this trivial.
- A signalling-library upgrade can be swapped in behind the same `Transport` interface (4.E7) later, with no change to the game code.

### 3.4 Duels in multiplayer

| Mode | How the duel resolves |
|---|---|
| Hotseat | Two players on one device share the touch controls (split screen), or auto-resolve |
| Live (WebRTC) | **Lockstep**: both peers run the same fixed-tick sim and exchange inputs per tick (small input delay buffer). Requires the duel sim to be fully deterministic (already no `Math.random`, fixed `DT`; verify in tests and add a state-hash check each second to detect desync) |
| Play-by-link | The **attacker plays the duel against a deterministic AI "ghost"** controlling the defender (skill from a per-player setting), and the final `DuelOutcome` plus an input-recording hash goes into the link. Alternative per match: **auto-resolve** with the seeded AI-vs-AI sim (`ai/autoDuel.ts`), so nobody plays a duel for the other side |

Trade-off to decide in E7: the ghost approach is fun but the outcome is reported by the attacker, so it is trust-based. The recorded inputs are in the link, so a suspicious result can be re-simulated and verified by the opponent's client, which makes cheating detectable without a server.

---

## 4. Execution plan

Ordering logic: first make the engine data-driven (so every later feature is content, not rewrites), then ship the highest-value replay features, then multiplayer on top of the stable action format, then the campaign and meta layers. Each phase is independently shippable.

### E1. Foundations: configurable matches and an action log (≈1–2 days)

Purpose: everything later depends on a match being described by data and replayable.

- Add a `MatchConfig` type (`engine/data/matchConfig.ts`): `{ mode, board, armies: Record<Court, ArmySpec>, spellLoadouts, cycle, events, seed, rules }`. `newGame(seed)` becomes `newGame(config)` with a default that reproduces today's game exactly (keep existing tests green).
- Make `GameState` carry an `actions: Action[]` log (or keep it alongside in a wrapper) and add `replay(config, actions)`.
- Move hard-coded constants into the config: board size and beacons (`rules/board.ts`), `ECLIPSE_ROUND`, `ROUND_LIMIT`, `DAY` length, setup layout (`roster.ts`).
- Pure serialisation helpers (`engine/serialize.ts`): encode/decode config and action list to compact bytes. Round-trip tests.
- Persist an in-progress game to `localStorage` for resume.
- Tests: replay equals live play over the soak games; default config equals today's `newGame`.
- Exit: all existing tests pass; no UI change except Resume.

### E2. Army draft and setup variety (≈2–3 days)

Delivers recommendation 1 and part of 4.

- Piece costs table (seed from `VALUE` in `ai/strategy.ts`, then tune with the simulator). Draft budget (e.g. 40) with limits: exactly one Leader, max per role.
- Setup modes: **Classic** (today), **Draft**, **Random mirrored**, **Daily seed**. Placement of drafted pieces on the home two columns (auto-arrange with manual drag as stretch).
- Board variants as data: alternate beacon layouts, blocked squares (`legalMoves` and duel position respect blocked squares). Start with 2–3 variants.
- AI: add a draft heuristic for the AI court (balanced by role value, noise by difficulty). Update `evaluate` so it does not assume the classic army.
- UI: Draft screen in Skirmish setup, a setup summary card.
- Balance: extend `src/sim` to run drafted armies; report win rate by role and by composition to find degenerate drafts. Matchup table (`matchupData.ts`) is per role pair, so no regeneration is needed unless duel stats change.
- Tests: legal drafts only, mirrored randomisation fairness, blocked-square movement.
- Exit: three setup modes playable vs the AI; sim shows no draft composition above ~60% against the field.

### E3. Court identity and the spell system (≈3–4 days)

Delivers recommendations 2 and 3.

- Spells become data with court affinity: `SpellDef { id, name, text, courts, target(), apply() , cost }`. Keep the 7 existing; add ~6 new, e.g. *Hold the Light* (freeze one ring for a round), *Eclipse Early* (advance two phases), *Shroud* (untargetable for a turn), *Exchange* (swap two allies), *Mirror* (repeat the last enemy spell), *Sacrifice* (convert a piece's HP into Leader HP).
- Per-court signature spells (2 each) plus shared pool; loadout of 4 chosen at setup (part of the draft screen). Optional recharge: a cast spell returns after N rounds (rule toggle).
- Court passives tied to light (data-driven, small): e.g. Solari fliers +1 range in full light; Umbral regenerate +1 on dark squares at round end. Surface them on piece cards and in the tutorial.
- AI: spell generation in `strategy.ts` reads the loadout; evaluation weights for new spells; hint card explains them.
- Tests: each spell has target and apply tests (follow `spells.test.ts`); loadout validation.
- Exit: courts feel distinct in sim self-play (different win-shape stats); all spells covered by tests.

### E4. Match modes, events and the Eclipse showdown (≈2–3 days)

Delivers recommendations 5 and 6 and the pacing fix.

- Win conditions as pluggable rules: Beacons, Leader Capture, Score Race (beacons score per round), King of the Hill. Selection in setup; the `evaluate` function and win text follow the mode.
- Day events (toggle): a small deck drawn at dawn each day, announced on the dial, with 1–2 round effects (Solar Flare, Fog, Tremor, …). Events must be deterministic from the seed so replay/online stay in sync.
- Variable cycle: length and direction options.
- Eclipse showdown: replace or supplement the round-50 cap with a shrinking safe zone (outer ring becomes lethal each round from the Eclipse onward), so beacon-sitting is no longer a stable stall. Re-run the soak tests; target: median game length 25–40 rounds, no game past the cap.
- Tests: each mode's win detection, event determinism, soak with every mode.
- Exit: soak shows no stalls; modes selectable and tutorial updated.

### E5. Piece growth (≈1–2 days)

- Veterancy: a piece with 2/4 duel wins gains +1 max HP, then a perk chosen from two. Promotion for Footsoldiers reaching the enemy home column (becomes a Charger or Marksman, rule toggle).
- Piece state gains `wins`, `perks`; duel config reads perks. Persist nothing across games in this phase.
- UI: piece card shows record and perk; a promotion chooser.
- Tests: perk application, promotion legality, reducer determinism.

### E6. Hotseat and local play (≈1–2 days)

- Local two-player mode: handoff screen between turns (hides the board for private spell choices, optional). Duel options: split-screen controls on one device, or auto-resolve. Optional pie rule (second player may swap sides after the first move).
- Hint/odds visibility toggle.
- Tests: turn handoff state machine, no AI worker invoked for a human court.

### E7. Online play: play-by-link, then live WebRTC (≈4–6 days)

Split into two commits; stop after each.

**E7a: play-by-link**
- Implement the codec from E1 into URL-hash links, compression with `CompressionStream` (fallback: uncompressed base64url).
- Screens: Invite (create game, copy/share/QR), Waiting, Resume from link. Stale-link detection by action count. `localStorage` game list for multiple concurrent games.
- Duel in async games: attacker plays against the deterministic ghost AI, result and input hash embedded; or auto-resolve (setup option). Add a verifier that re-simulates a result from the recorded inputs.
- Tests: encode/decode round trips, replay from link equals original, tampered link rejected, stale link ignored.

**E7b: live WebRTC (best effort)**
- A `Transport` interface (`send`, `onMessage`, `close`) with a `WebRtcTransport` (manual handshake via link/QR) and a loopback transport for tests. Game code only sees the interface, so a signalling library can replace the handshake later.
- Lockstep duel: input buffer with a small fixed delay, per-second state hash for desync detection, abort-to-auto-resolve on desync.
- Handshake UI with plain-language connectivity failure message and a one-tap switch to play-by-link; `resync` after reconnect.
- Tests: loopback transport simulating latency and drops, deterministic duel parity between two sim instances, desync detection.
- Risks: NAT failures (documented, accepted), mobile browsers backgrounding the tab (resume by `resync`), sim determinism across engines (floating point is deterministic for the same operations in modern JS engines, but add the hash check).

### E8. Campaign 2.0, progression and meta (≈4–5 days)

Delivers campaign and meta recommendations.

- Opponent definitions grow from `setup` functions to `{ personality, army, loadout, board, mode, event rules, boss rule }`. AI personalities as weight profiles in `strategy.ts` (aggression, beacon focus, spell usage, retreat threshold).
- Star ratings per level (e.g. no pieces lost, won before Eclipse, no spells used), stored with progress.
- Rewards: stars/wins unlock pieces, spells, boards and cosmetics, which feed the draft pool (progression gates variety, so keep it light).
- Campaign map with branching or a best-of-three tournament format.
- Stats and achievements; last-game replay viewer (from the action log).
- Puzzle/scenario pack: authored positions with "win in N" goals, using the E1 serialisation. Daily puzzle and daily seed use the date as seed (no server needed; the "global" aspect is just a shared date).
- Practice arena: any matchup with odds card.
- Cosmetics: board and piece themes.
- Storage: move progress from the single `PROGRESS_KEY` number to a versioned JSON blob with migration.

### Cross-cutting, every phase

- Tutorial: add a step or optional lesson for each new rule; keep the first-run tutorial short.
- AI: re-tune difficulty profiles after each rule change; update `hint.ts` explanations.
- Balance: re-run `npm run sim` after any change to costs, stats, spells or perks; record results in the commit message.
- Save/versioning: every serialised format carries a version byte from E1 on.
- Accessibility: colour-blind safe light indicators, reduced-motion option, touch-target sizes.
- Performance: AI runs in the worker (`ai/worker.ts`); watch search cost with larger drafted armies and blocked boards.

## 5. Suggested order and checkpoints

| Phase | Depends on | Checkpoint for review |
|---|---|---|
| E1 Foundations | none | Replay and config tests green, no behaviour change |
| E2 Draft and setups | E1 | Draft playable vs AI, sim balance report |
| E3 Courts and spells | E1, E2 (loadout UI) | Distinct court play, new spells tested |
| E4 Modes, events, showdown | E1 | Soak report: no stalls, median length |
| E5 Piece growth | E2 | Perks and promotion balanced in sim |
| E6 Hotseat | E1 | Two humans on one device |
| E7a Play-by-link | E1, E6 | Full async game between two browsers |
| E7b Live WebRTC | E7a | Live game; documented fallback |
| E8 Campaign and meta | E2–E5 | Campaign 2.0, stats, puzzles, daily |

If time is short, ship E1 → E2 → E6 → E7a → E3 first: that delivers variety, two-player and online with the least risk. E7b and E8 are the most open-ended.

## 6. Open decisions for review

1. Async duel resolution default: ghost-AI play (more fun, trust-based, verifiable) or auto-resolve (fully fair, less engaging)?
2. Spell recharge: keep spells once-per-game, or recharge after N rounds?
3. Scope of progression rewards in E8: cosmetics only, or gating draft pieces and spells?
4. Is a third-party signalling library acceptable later for one-click live invites, given the "no backend" goal?
5. Budget and per-role limits for drafting (to be tuned by the sim).
6. Pie rule on by default in human-vs-human?
