# UX finish: more professional, still fun

Status: **in progress.** Written 2026-10-28 from the UX review. Items are the ones the owner approved; palette consolidation, noise cuts, the top bar and the brand lockup were not chosen and are out of scope.

## Ground rules

- Every new effect respects `settings.reduceMotion` and, for flashes, `flashesReduced`. Sound stays behind mute and volume; haptics behind the haptics option.
- Engine rules never change. Effects read game state and events only.
- Pure rules (thresholds, timings, ranks) live in small tested modules; drawing stays in components.
- Text goes through `t()` in `src/i18n/en.ts`.
- Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase; stop after each.

## Phase 1: Type scale

- Five steps in `:root`: `--fs-xs` 0.8rem, `--fs-sm` 0.875rem, `--fs-md` 1rem, `--fs-lg` 1.4rem, `--fs-xl` 2.1rem. Every ad hoc `font-size` in `index.css` maps to the nearest step. Left alone on purpose: the 2.4/2.6rem banner and countdown, the 1.7rem pass-screen heading, `em` sizes, and SVG text (`.lum-mark`, `.clock-ring small`, `.odds-tag`).
- `font-variant-numeric: tabular-nums` on the dial, clocks, timers, wallet, costs, counts, stats and scores.
- Cinzel (`--display`) only on headings and names: small uppercase labels (`.duel-info h3`, `.duel-brief-card h3`) move to Nunito bold.

## Phase 2: Eclipse loader

- A themed first-load screen in place of a blank frame: a sun disc with a moon closing over it, drawn in `index.html` and CSS so it shows before React and the fonts load; `main.tsx` removes it once it renders.
- Reduce motion shows the still, closed eclipse.

## Phase 3: "Next up" card

- Merge the persona greeting, coach card, first-steps checklist and suggestions on the main menu into one card with a single slot: the highest-priority item shows (advice, then first steps, then a suggestion, then the greeting). The slot choice is a pure function in `menuModel.ts`, tested.
- The card keeps the persona face as its avatar and the existing dismiss actions.

## Phase 4: Leaded-glass portrait frames

- The WebP persona portraits get an arched leaded-glass frame (lead lines, a corner highlight) and a per-persona tint overlay, so they sit with the SVG stained-glass busts in `Portrait.tsx`.
- One shared `PersonaFace` treatment covers menu, bubbles, briefing and Company list.

## Phase 5: Desktop pages

- At the 900 px breakpoint, Battle, Campaign, Story, Collection, Settings and Stats use a two-pane layout: list on the left, detail or preview on the right (the Collection's Showcase becomes the right pane).
- The empty gutters get a faint vertical gilded rule and a large dim emblem so the column looks intentional.
- Phone layouts are unchanged.

## Phase 6: Rewards fly to the wallet

- Settle payouts when the result opens (not on Continue), then show reward lines in the dialog and fly coins from each line into the wallet chip.
- Reduce motion shows the totals without the flight.

## Phase 7: Captured pieces

- A captured-piece tray beside or under the board for each court, with a material difference. Pieces drop in with a small bounce and a clink.
- Read from the move history; the engine is untouched.

## Phase 8: Hour look for the HUD

- Extend the board's Hour wash to the HUD frame and dial, with a dawn-to-dusk gradient strip that ends at the Eclipse.

## Phase 9: Named-moment banners

- A short Cinzel banner for first blood, a Leader check, a streak of three and the Eclipse. Rare, fast, tap to skip. Triggers are a pure tested function over match events.

## Phase 10: Persona reactions

- A small persona portrait in the match HUD corner whose expression changes after a capture, a loss and at the Eclipse, tied to the existing banter events.

## Phase 11: Visible progression

- A Court rank crest that upgrades with mastery.
- A glint on cosmetics by rarity.
- A daily-streak calendar with a stamp animation for each day.

## Phase 12: Audio layer

- A soft ambient bed that follows the Hour (`musicLevel`), and a distinct UI sound set: tap, confirm, deny, reward.
- All behind the existing mute and volume settings.

## Phase 13: Title touch

- Tapping the sun or moon on the title hero nudges the eclipse; the Leaders react to a tap. Off under reduce motion.

## Status

Phase 1 done: the type scale tokens are in `:root` and `index.css` uses them; tabular figures are on changing numbers; small labels no longer use Cinzel.

Phase 2 done: `index.html` draws the eclipse loader (inline CSS, so it shows before React and the fonts load); `main.tsx` fades it out and removes it after the first render. Reduce motion (setting or OS) shows the still, closed eclipse.

Phase 3 done: the main menu's greeting, coach card, first-steps list and suggestions are one "Next up" card with the persona face as avatar. `nextUpSlot` in `menuModel.ts` (tested) picks advice, then first steps, then suggestions, then the greeting; dismiss buttons are unchanged.

Phase 4 done: `PersonaFace` wraps the WebP portrait in an arched `.persona-frame` with a house tint overlay (solari, umbral, marches, hour), lead lines and a corner highlight; the size class now sits on the frame. The SVG bust fallback is unchanged.

Phase 5 done: Battle, Campaign, Story, Collection, Settings and Stats carry a `two-pane` class with `pane-main` and `pane-side` wrappers (transparent on phones). At the 900 px landscape breakpoint the list sits left and a sticky side pane right, split by a faint gilded rule with a dim eclipse emblem below the side content. The side pane is the Collection's Showcase, Stats' overview, Story's Company/Bonds/Achievements, Settings' second half, and a hover/focus preview on Battle and a star summary on Campaign.

Phase 6 done: plain games (skirmish, campaign, scenario, daily, weekly, ladder) settle when the result opens: `Game` calls `onEnded` once, `App` runs `finishGame` and keeps it in `settledGame` so Continue does not pay twice. The dialog lists the reward lines (`RewardLines`); each line that pays Shards flies coins from itself to the wallet chip (`flyCoins`, `shardsIn` and the toast's flight claim in `rewardFx.ts`, tested). Reduce motion shows the lines without the flight. Tournaments, gauntlet, story, puzzles, online and hot-seat still settle on Continue. First-win confetti reads `firstWin` as it was at the start of the game.

Phase 7 done: `FallenTrays` (under the board, in the side column on desktop) shows a row per court of the pieces it has lost, read from `state.captured` through `fallenOf`, with the material lead (`materialLead`, scaled by the AI's piece values) beside the court that is ahead. Arrivals after the board opens drop in with a bounce and an `sfx.clink`; reduce motion drops the animation through the global rule. The helpers are in `fallen.ts`, tested.

Phase 8 done: the HUD wears the board's Hour: `Dial` takes a `hud-rising`, `hud-waning` or `hud-eclipse` class (from `hourStrip` in `ui/dial/hourStrip.ts`, tested) that washes the frame and tints the dial's glow. A dawn-to-dusk strip runs along the HUD's lower edge with a marker that walks toward a dark Eclipse disc at its end and hides once the Eclipse falls. Reduce motion drops the transitions.

Phase 9 done: `momentOf` in `moments.ts` (tested) reads the latest step and names first blood, a triple capture, a Leader check or the Eclipse, once each a game, picking the rarest when a step makes several and staying quiet on the deciding move. `Game` shows it as a `.moment` Cinzel pill (high on the screen, clear of the turn banner) that fades after 1.4 s or on tap. Reduce motion shows it still.

Phase 10 done: `moodFor` in `mood.ts` (tested) maps the banter events (a capture, a lost piece, danger, the Eclipse and so on) to a mood. A small `.persona-corner` portrait in the HUD (a `face` and `mood` on `Dial`) nods, flinches or darkens with the mood, settles back to calm after 3.2 s, and shows the result's mood once the game ends. It appears only against a named opponent with Banter on, and reduce motion drops the animation but keeps the tint and glow.

Phase 11 done: `courtRank` in `progression.ts` (tested) turns the summed mastery levels into one of six Court ranks (Squire to Archon); `RankCrest` draws a shield whose colour, inner rim, pips and eclipse disc advance with the rank, at the top of Stats' side pane. Collection rows above Common carry a `.glint` sheen whose period, strength and phase come from `glintOf` (rarity) and the cosmetic's id. The Daily page shows `stampWeek`, the last seven days, with a sun stamp that thumps in, staggered, on each day the streak covers. Reduce motion drops the animations through the global rule.
