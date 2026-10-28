# Accessibility plan: ADA / WCAG 2.2 AA

Status: **not started.** Written 2026-10-28 from a read-only code survey (no audits were run); every gap below is "likely", to be confirmed when its phase starts.

## Background

- The ADA has no technical standard for software. Courts and the DOJ use WCAG 2.1 AA as the working benchmark; we target WCAG 2.2 AA.
- Private apps fall under Title III, which is enforced mostly through demand letters and lawsuits, not a checklist. Have counsel confirm whether a game is exposed at all; the menus, shop and settings are the likeliest targets.
- Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase; stop after each so the context can be cleared.

## Already in place (do not redo)

- `prefers-reduced-motion` in CSS plus the `reduceMotion` setting (`data-motion="reduced"`).
- `largeUi` setting (bigger text and buttons), `marks` (non-colour markers), `aids`, the Clear Sight theme.
- Keyboard play on the board: focusable `role="grid"` with arrows, Enter and Space (`src/ui/board/Board.tsx:98-112`).
- Global `:focus-visible` outline (`src/index.css:207`), 44px minimum touch targets.
- `role="dialog"`, `role="status"`, `role="alert"` and `aria-live` on many dialogs and messages.
- `<html lang="en">`, haptics toggle, sound off by default behind a `SoundPrompt`.

## Phase 1: Quick wins (under an hour)

1. **Allow zoom** (WCAG 1.4.4): remove `user-scalable=no` from the viewport meta in `index.html:6`. Check the layout survives 200% zoom by reading the CSS for fixed heights and `overflow: hidden`.
2. **Focus indicator on the board** (2.4.7): `svg.board:focus { outline: none }` (`index.css:1140`) is only acceptable if the keyboard cursor cell is clearly drawn. Make the cursor highlight high-contrast and visible in every theme.
3. **Lint**: add `eslint-plugin-jsx-a11y` to the lint config and fix what it reports. This replaces browser testing as the ongoing guard.

## Phase 2: Keyboard and focus

4. **Keyboard access to clickable non-buttons** (2.1.1):
   - `StoryReader.tsx:45` is a `div role="button" tabIndex={-1}`, unreachable by keyboard. Make Space, Enter and Right Arrow advance, and give it a real focusable control.
   - Clickable `<g>` elements (`Editor.tsx:100`, `Board.tsx:122,162`) need key handling or button semantics. The board already has the grid cursor; the Editor does not.
5. **Shared `useDialog` hook** (2.4.3, 2.1.2): trap focus, close on Escape, restore focus to the opener, and set `aria-labelledby`. Apply to `DuelResult`, `SoundPrompt`, `AttackConfirm`, `TipCard` (modal), the story/briefing overlays and the Collection showcase.
   Medium effort, the largest item in this phase.

## Phase 3: Time, announcements, audio

6. **Untimed option** (2.2.1): a setting that disables the turn clock for fights, alongside the existing duel speed. The pre-fight countdown already skips on tap. Real-time exceptions apply to the duel itself, so document that.
7. **Move log live region** (4.1.3): one visually hidden `aria-live="polite"` region narrating turn changes, moves, captures, combat results and the Eclipse. Check `src/narrate.ts` first; it may already produce the strings.
8. **Sound** (1.2, 1.4.2): confirm nothing meaningful is conveyed by audio alone (combat results, urgent clock), and that audio stays off until the user opts in.
9. **Flashing** (2.3.1): review WinBurst, the Eclipse flash, ripples and duel effects for more than 3 flashes per second or large saturated flashes. `reduceMotion` must remove any flash, not only movement.

## Phase 4: Contrast

10. **Contrast script** (1.4.3, 1.4.11): a script in `scripts/` that reads every theme's CSS variables (`THEMES` in `src/settings.ts`, including paid themes) and checks text and UI contrast (4.5:1 text, 3:1 UI). Fix failures, starting with the dim text (`opacity: 0.6` at `index.css:496`) and small text.
    Tedious but mechanical. Add a unit test so a new theme cannot ship below the bar.

## Phase 5: Statement and optional work

11. **Accessibility statement**: a short page in Settings or the README listing supported features (reduced motion, large UI, marks, keyboard play) and a contact address. Lawsuits often start from a missing contact path.
12. **Full non-visual play** (optional, hard): a spatial strategy game is hard to play with a screen reader. The practical ceiling is the keyboard grid with good cell labels plus the move log from item 7. A dedicated non-visual mode is a separate project; skip unless counsel or users ask.

## Effort

| Phase | Effort |
|---|---|
| 1 | under an hour |
| 2 | about half a day |
| 3 | about a day |
| 4 | about a day |
| 5 (item 11) | an hour |
| 5 (item 12) | weeks; separate project |

Suggested order: 1, 2, 4, 3, 5. Phases 1 and 2 remove the likeliest findings.
