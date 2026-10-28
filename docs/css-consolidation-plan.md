# CSS consolidation plan

Goal: shrink and de-duplicate `src/index.css` with **no visible or functional change**. Every phase is a behaviour-preserving refactor: nothing is recoloured, re-timed or re-laid-out. Shipped size gains are small (the build already minifies 134 KB to 111 KB, 23 KB gzipped); the payoff is fewer places to edit and fewer rules that can drift apart.

Baseline (before phase 1): 1808 lines, 134,344 bytes source, 111,253 bytes built, 22,962 bytes gzipped.

## Working rules

- CLAUDE.md applies: verify with `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` only. No browser testing. Commit and stop after each phase; do not start the next until asked.
- **Equivalence check, every phase.** `scripts/css-ledger.mjs` flattens a stylesheet into an ordered ledger of atomic declarations (`context | selector | prop: value`), one per selector in each selector list, in source order, with keyframes listed by name. Diff the ledger of `HEAD:src/index.css` against the working file:
  `diff <(git show HEAD:src/index.css | node scripts/css-ledger.mjs) <(node scripts/css-ledger.mjs src/index.css)`
  Every line in the diff must be explained by the phase's intent. Anything else is a bug.
- **Move rule.** A phase that only deletes lines, or joins rules that are already adjacent, leaves the ledger order intact. Where a rule must *move* to be joined (phases 3 and 4), first check that no rule between the old and new position sets the same property on an element the moved selector can match; otherwise leave it where it is.
- Never touch dynamically-built class names (`rarity-*`, `mood-*`, `grade-*`, `tier-*`, `card-*`, `cell-*`, `hud-*`, `fx-*`, `turn-*`, `court-*`, `art-*`, `pane-*`, `game-*`, `duel-*`): they look unused to a text search but are not.
- Keep every selector's specificity. Join with plain selector lists, never `:is()`.

## Phase 1: tooling and zero-risk clean-up

1. Add `scripts/css-ledger.mjs`.
2. Replace `var(--t-med, 0.25s)` (undefined token, always the fallback) with the literal `0.25s`.
3. Delete custom properties that are defined and never read: `--shadow-3`, `--surface-1`, `--surface-2`, `--line`, `--radius-sm`, `--radius-md`.
4. Merge byte-identical keyframes, keeping the first name and repointing the references: `art-turn` and `beacon-spin` into `spin`; `intro-fade` into `fade-in`; `kill-in` into `count-fade-in`; `screen-in` into `rise-in`; `stat-in` into `story-in`.
5. Delete the `[data-motion='reduced']` rules that only set `animation: none` / `transition: none`: the blanket `:root[data-motion='reduced'] *, *::before, *::after { animation: none !important; transition: none !important }` already covers them. Keep every one that sets `display: none` (`.fall`, `.win-burst`, `.eclipse-cinema`, `.kill-cam`, `.confetti`).

## Phase 2: cosmetic preview duplicates

Lines ~1102-1153 (`:root[data-pieces|board|codex=...]`) and ~1428-1482 (`main .cstage[...]`) repeat each other. Join each pair into one selector list at the position of the root rule. Both selectors keep their own specificity. The `.cstage` rules follow later rules today, so check nothing between the two positions sets `fill`, `animation`, `filter` or `box-shadow` on `.pane-*`, `.sq`, `.glow` or `.show-codex`. Not doing: a `--pane-*` variable rewrite (the theme writes those inline on `<html>`, so ordering would need re-proving).

## Phase 3: shared rules

Each as a selector list, subject to the move rule:
- the three `nth-child` animation-delay ladders (`.mode-cards`, `main.app:not(.main-menu) .choices`, `.next-up-list`)
- `.menu-buttons button` and `.tabs button` base; `.tabs button.on` with `.menu-buttons button.primary`
- `.tip-foot button`, `.next-up-body > button`, `.coach-bubble .tip-foot button`; `.tip-body h4/p` with `.coach-bubble h4/p`
- the Solari/Umbral plate gradients, text colours and borders of `.turn-banner`, `.duel-countdown`, `.moment` (glow sizes stay per rule)
- other byte-identical blocks reported by the analysis (identical `color`, `opacity`, `display:none`, and so on) only where the rules are already adjacent

## Phase 4: merge split selectors

21 selectors are defined twice (`.hud`, `.dial`, `.dial-now`, `.board`, `.tray`, `.main-menu`, `.lesson`, `.spell`, `.attack-btn`, `.row-pick button`, `.choice.won`, `.menu h3`, `.campaign .choice`, `.duel-brief-cards`, the `.menu-art` animation overrides, and so on). Merge each into the first definition where the move rule allows, dropping declarations the later copy overrides (for example `.dial-now`'s dead `box-shadow`). Where a merge is unsafe, leave both and add a comment.

## Phase 5: only if asked

- Make `prefers-reduced-motion` behave like the in-app setting (one blanket rule instead of 26 blocks). This changes behaviour for OS-level users, so it needs a decision.
- Name repeated colours/radii as tokens (maintainability only; makes the CSS bigger).
- Split `index.css` into per-feature files imported in the same order.

## Progress

- [x] Phase 1: done. 1808 to 1786 lines; source 134,344 to 132,032 bytes; built CSS 111,253 to 109,256; gzip 22,962 to 22,683. Ledger diff showed only the intended removals and renames.
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
