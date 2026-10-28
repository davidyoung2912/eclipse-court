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
