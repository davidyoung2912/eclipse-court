# Rules: Classic / Standard / Advanced

Rules complexity is a separate axis from the AI level (Easy / Normal / Expert). The AI level says how well the opponent plays; the Rules tier says how many things the player has to track. The labels must never overlap, so the tiers are always called **Rules: Classic / Standard / Advanced**.

Each phase ends with a commit and a stop (see CLAUDE.md). Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing.

## Findings that shape the plan

- Today's Skirmish default is already close to the plain game: no events, growth, promotion, recharge or fog, one-use spells, Beacons win. The one exception is `showdown`, which the setup screen starts switched on.
- So "Standard" is roughly today's default, and **Classic must be genuinely simpler**, which means switching off things that are currently always on:
  - Court passives (`passives: true` in `DEFAULT_CONFIG`).
  - The spell list (currently the full seven, with no way to remove them).
  - Possibly the Eclipse showdown.
- Those need small engine switches, so they are the only engine change.
- Rules already live in `PresetRules` and `SetupChoice`, and `skirmishConfig` turns them into a `MatchConfig`. A tier is therefore a named `PresetRules` plus two new fields, not a new system.

## Tier definitions (to confirm)

| | Classic | Standard | Advanced |
|---|---|---|---|
| Win | Beacons | Beacons | Beacons or Hill (player's choice) |
| Spells | Mend, Blink, Swap only | The seven, one-use | The seven, recharging after 8 rounds, loadouts |
| Court passives | Off | On | On |
| Light cycle | Standard | Standard | Choice incl. long, swift, reverse |
| Showdown | Off (Eclipse still starts at round 30, no closing ring) | On | On |
| Day events | Off | Off | On |
| Growth / promotion | Off | Off | On |
| Army | Fixed 12 pieces | Fixed or draft | Draft, random, loadouts |
| Turn clock | Off | Off | Optional |

Advanced is "everything unlocked": it does not force the options on, it opens the full set of toggles. Classic hides the toggles it fixes.

## Phase R1: Engine switches and tier data (no UI)

1. `MatchConfig`: add `spells?: readonly Spell[]` semantics to the existing `loadouts` (a short list is already supported; confirm that `loadoutProblem` allows the three-spell list and an empty list) and `passives` (already exists: just allow it to be set false from a setup).
2. `setups.ts`: add `passives?: boolean` to `SetupChoice` and `PresetRules`, wire it in `skirmishConfig` and `normalRules`. Absent keeps today's behaviour, so old challenge links and replays decode unchanged.
3. Add `RULESETS` next to `PRESETS`: `{ id: 'classic' | 'standard' | 'advanced', name, icon, text, rules, locks }`, where `locks` lists the options the tier fixes and `Advanced` lists none.
4. Tests: each tier produces the expected `MatchConfig`; a v-previous config with no `passives` still replays identically; each tier plays 20 AI-vs-AI games to a finish with no crash (reuse the preset soak harness in `presets.test.ts`).

## Phase R2: Skirmish setup UI

1. A **Rules** row at the top of Skirmish setup, above Presets: three `choice` buttons with a one-line description.
2. State: `rules` tier, default **Standard** (so existing behaviour is the default). Choosing a tier applies its `PresetRules` through the existing `applyPreset` path and clears any chosen preset.
3. Option panels the tier locks are hidden under Classic, and shown whole under Advanced. Standard shows the current screen minus the Advanced-only toggles (events, growth, promotion, recharge, clock).
4. Presets sit under Advanced only, because each is a bundle of Advanced rules. Under Classic and Standard the strip is hidden, with a one-line pointer: "Presets need Advanced rules."
5. Hot-seat keeps working: the tier only changes config, not controllers.

## Phase R3: Tie-ins, stats and onboarding

1. **Learn to Play** flow: after the tutorial, the first Skirmish opens on **Classic** rather than Standard.
2. **Achievements and stars:** campaign and scenarios keep fixed rules and are unchanged. Skirmish stats count all tiers; achievements that depend on full rules (for example spell or growth ones) count Standard and Advanced only.
3. **Replay and share links:** nothing to add, since the tier is not stored, only its resulting config. The challenge screen can name the tier by matching the config against `RULESETS`.
4. **Battle hub summary line** and Stats: show "Classic / Standard / Advanced" on the last-game row only if cheap; otherwise skip.

## Risks and open questions

- **Classic spell set:** which three? Blink, Mend, Swap are the easiest to read; Revive, Bind and Turn the Hour need the most explaining. Confirm.
- **Classic balance:** the matchup table and AI search weigh spells and passives. Add a soak/balance run for Classic before shipping; if a side wins more than about 60%, tune the three-spell list.
- **Showdown in Classic:** I propose off to keep the end game simple, but the Eclipse (round 30) still starts, so games keep a time limit.
- **Presets vs tiers:** presets are themed bundles and tiers are a complexity ladder. Keeping presets under Advanced keeps the two from overlapping.
- **No browser check:** layout of the new Rules row is checked by reading the CSS only. Expect a possible follow-up tweak commit.

## Order

R1, then R2, then R3. Stop after each. R1 can ship alone with no visible change.
