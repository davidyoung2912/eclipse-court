# Skirmish setup redesign

**Status: done (S1).** One build phase, one commit. Section summaries are built in `SkirmishSetup.tsx`; only the "Changed" logic is unit-tested.

The skirmish page was one flat column of ~12 sections (8 button grids, 6 checkboxes, 2 inline pickers) with Start at the bottom. This redesign makes it approachable while keeping every option.

## Principles
- View-layer only: state, `choice()`, `applyTier`, `applyPreset`, `applyRules`, and the `onStart` / `challengeLink` contract are unchanged.
- Other menus unchanged: new `.setup-*` classes only; shared `.choice` rules are untouched.
- Tier locks unchanged: the existing `open(group)` checks decide what shows; a section with every group locked is hidden.

## Layout (top to bottom)
1. **Quick match**, always visible: Players (segmented), Your court (cards with leader avatar), Opponent (segmented, description of the selected level underneath), and the setup summary line.
2. **Rules** tier (segmented) and **Presets** (compact grid, locks and stars kept, "customised" tag kept).
3. **Collapsible sections**, closed by default, each header showing the current value and a "Changed" dot when it differs from the tier's defaults:
   - Army & Board: army mode, Draft picker, board.
   - Spells: Classic or Loadout, Loadout picker, recharge toggle.
   - Win & Light: win condition, light cycle, reverse toggle.
   - Hazards & Growth: day events, Eclipse showdown, Veterancy, Promotion (toggle rows).
   - Turn clock: clock, extra time.
4. **Sticky action bar** (mobile and desktop): Start, Share, Back, plus a reason line that opens the right section when Start is disabled.

## Behaviour
- Choosing Draft or Loadout opens its section. Applying a preset opens every section it changes.
- "Changed" is a pure function in `menuModel.ts` (`changedSections`), comparing against the tier's own rules (the same source `applyTier` uses), with tests.
- Hot seat keeps its limits: no Draft, no Loadout.

## Components (`SetupControls.tsx`)
`Segmented` (radiogroup of buttons with a hint line), `ToggleRow` (label, description, switch; a real checkbox with `role="switch"`), `Section` (controlled `<details>` with title, summary and Changed dot).

## Checks
`npm run test`, `npm run lint`, `npx tsc -b`, `npm run build`. No browser testing; the look on desktop and phone is for the user to check.
