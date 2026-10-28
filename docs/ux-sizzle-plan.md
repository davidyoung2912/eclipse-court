# UX sizzle: phased plan

Status: **phases 1-3 done.** Written 2026-10-28. Every idea from the "more UX sizzle" discussion, grouped into eight phases (duel first, then board, then app-wide).

## Ground rules

- Every new effect respects `settings.reduceMotion` (skip it, or use a calm still version). Audio stays behind the existing mute and volume settings; haptics behind the existing haptics option.
- No strobing full-screen flashes: flashes stay small, brief and at most about three a second until the **Reduce flashes** setting lands in phase 8, which then gates the existing ones too.
- Engine rules never change. Effects read `GameState` / `DuelState` and events; nothing alters a result. Scoring, AI and replays are untouched.
- Pure rules (timings, sizes, thresholds) live in small testable modules like `src/juice.ts`; drawing stays in the components and `duelFx.ts`.
- Text goes through `t()` in `src/i18n/en.ts` where it is a setting or label. Effect words drawn on the canvas ("K.O.") may stay literal like "FIGHT!".
- Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase; stop after each.

## Phase 1: Duel impact feel

Fight page, `duelFx.ts` / `DuelView.tsx`, with the pure numbers in a new `src/duelImpact.ts` (tested, beside `juice.ts`).

- Hit-stop that scales with damage (heavier hits freeze longer), plus a camera punch-in toward the impact that eases back.
- Delayed "ghost" damage bar: a pale segment drains after the real bar, which also shifts green to amber to red.
- Damage-scaled impact: a shockwave ring and debris sparks that grow with the hit.
- Low-health edge pulse on the player's side, quickening as health falls.
- K.O. finisher: a longer freeze on the killing blow, slow-motion for the effects, a zoom and a "K.O." slam, with a slightly longer end delay.

## Phase 2: Duel presentation

- Dynamic camera: a subtle follow-zoom that tightens as fighters close in or health drops.
- Attack telegraphs: a ground decal that fills before slams and lobs land; a charge aura during wind-up.
- Arena life: ambient light pulsing on hits and with the clock, a parallax layer that shifts with the shake.
- Versus intro (medallions sliding in from opposite sides) and an outro (loser dissolves, stats count up).
- Audio layering: hit pitch rising with a combo, a muffled low-pass during hit-stop, a crowd swell on K.O.

Phase 2 notes: pure numbers are in `src/duelPresentation.ts`. Lob shots already had a landing decal, so it now fills as the shot comes down; slams have no wind-up in the engine, so the telegraph there is the charge aura. The stats count-up on the outro was left out (the result screen is outside the duel view); the loser now dissolves instead.

## Phase 3: Board move feel

- Attacker lunge into the capture and a short fading comet trail along the path of the piece that moved.
- Arrival puff (dust or ring) when a piece lands, triggered from the settle animation.
- Tactile selection: idle wobble and stronger shadow on a lifted piece; legal-move dots pop in with a 20ms cascade from the piece; capture targets pulse.
- Turn handoff: the turn indicator swings or slides between sides and the ambient board glow tints to the active court.

Phase 3 notes: pure numbers are in `src/boardMotion.ts`. Effects are CSS animations driven from `Board.tsx` state, so reduce motion (which cancels all animations) covers them. The lunge fires only when the mover itself lands on a square after a capture; an attacker that holds its square does not lunge.

## Phase 4: Board capture drama

- Directional slash streak across the captured cell and a 60-80ms hit-stop on Leader captures.
- Light-ray sweep: a travelling wavefront when light or dark takes over cells (replaces the uniform ripple fade).
- Threat feedback: a slow red vignette pulse and heartbeat when your Leader is in danger; a gold shimmer on the winning cell when you are one move from winning.
- Persistent streak meter that fills and cracks with escalating particles, alongside the existing combo words.

## Phase 5: Eclipse moment and spell VFX

- Eclipse cinematic: the screen dims, a dark disc slides across a sun glyph, low boom and rumble haptic.
- Per-spell signature effects: caster charge-up, projectile or beam, impact bloom.
- Beacon pickups fly to the HUD with a trail.

## Phase 6: Kill-cam replay

- After a win, a slow-motion replay of the final capture with zoom and vignette, built from the step log the game already keeps.
- Skippable, off under reduce motion.

## Phase 7: App-wide motion

- Screen transitions: the iris idea for route changes, and View Transitions shared-element expansion (persona card into briefing) where supported.
- Button micro-interactions: press squash, hover sheen, tap ripple; numbers count up; staggered list entrances.
- Ambient menu life: drifting starfield, court emblem lit and shadowed, light parallax.
- Shimmer skeletons and a themed loader for medallion images.

## Phase 8: Rewards, haptics and accessibility

- Reward bursts: coin or shard burst flying to the wallet on unlocks, level-ups and purchases; rarity-coloured flip reveal for cosmetics; confetti on a first win.
- Distinct haptic patterns per event (double tap for a capture, long rumble for the Eclipse).
- **Reduce flashes** setting, gating every flash and chromatic-aberration effect added in earlier phases; photosensitivity pass over all new effects.
