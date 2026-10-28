# AI personas: phased plan

Status: **phase 1 done.** Written 2026-10-28. Character sheet: `docs/personas.md`. Lore: `docs/lore.md`.

## Goal

Eight named AI opponents with voices. They chat with the player in menus and during fights, using hand-written lines only (no generated text). A persona sits on top of an existing play style (`src/engine/data/personality.ts`); skill still comes from the difficulty.

## Decisions

- **Personas do not replace the generic ladder names.** "Veteran Rusher" stays. Personas appear in the skirmish opponent picker, the pre-fight briefing, the post-fight screen, the main menu and fight bubbles, and may be attached to a ladder game as a voice without renaming the foe.
- **Lines only for now.** No tap-to-reply quips.
- **At least 100 lines per persona**, every one unique within its persona, so a long session does not show repeats. Enforced by a test.
- **Short names on screen.** `name` is at most 12 characters, `tag` at most 20; the long form is for a detail card only. Enforced by a test.
- **SVG portraits for now**, from the existing stained-glass generator. The user's images arrive later and slot in with no code change (phase 6).
- **House is flavour.** A persona can wear either court's colours; it is a hint for the picker, never a rule.
- Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase; stop after each.

## Line categories

Every persona writes at least 6 lines in each category, and at least 100 in total. Lines are plain strings; `{player}`-style templating is not used.

| Category | When it is used |
|---|---|
| `greet` | Main menu hello (a different persona each day) |
| `picked` | They are chosen as the opponent |
| `briefing` | The pre-fight briefing |
| `open` | The fight's first move |
| `capture` | They take one of your pieces |
| `lose-piece` | You take one of theirs |
| `duel-win` | They win a duel |
| `duel-loss` | They lose a duel |
| `beacon-gain` | They take a Beacon |
| `beacon-lose` | You take a Beacon |
| `spell` | A spell is cast (either side) |
| `eclipse` | The Eclipse begins |
| `danger` | Their Leader is threatened |
| `threat` | Your Leader is threatened |
| `idle` | You think for a long time |
| `win` | They win the fight |
| `lose` | They lose the fight |
| `draw` | The fight is drawn |
| `rematch` | A rematch, or a streak (uses the ladder tallies) |

## Phases

### Phase 1: Persona data, SVG portraits, character sheet
- `docs/personas.md` and this plan.
- `src/engine/data/personas.ts`: the `Persona` type, the eight definitions (short `name`, `tag`, `fullName`, `title`, `house`, play style plus small weight tweaks), `personaById`, and `personaStyle` to resolve the weights the AI uses.
- Eight SVG portrait specs in `src/art/portraits.ts` and `personaPortrait`.
- Tests: unique ids, name and tag length limits, every play style valid, every portrait exists, a spread of houses.
- No UI, no lines.

### Phase 2: Line banks, first four (Cassia, Pym, Bea, Mudge)
- A line bank file per persona under `src/engine/data/personaLines/`, covering every category.
- A shared test over all banks: at least 100 lines, at least 6 per category, no duplicates within a persona, each line at most 90 characters, no empty lines.

### Phase 3: Line banks, last four (Lowen, Digby, Quill, The Regent)
- Same as phase 2. The shared test now covers all eight personas.

### Phase 4: Banter engine and the in-fight bubble
- `src/banter.ts`: pure functions that turn a state change (before, action, after) into a trigger, in the style of `narrate.ts`.
- A cooldown and a seeded, no-repeat line picker that cycles through the whole bank before reusing a line.
- Tests for the triggers, the cooldown and the no-repeat guarantee.
- A small speech bubble beside the portrait during a fight: non-blocking, tap to dismiss, reduced-motion aware.

### Phase 5: Menu integration
- Skirmish opponent picker: choose a persona (or random).
- Pre-fight briefing and post-fight line.
- Main menu daily greeting.
- Ladder rival line using the existing win/loss tallies, without renaming ladder foes.

### Phase 6: Settings, images, polish
- A Banter setting: Full, Quiet (results and Eclipse only) or Off.
- Bubbles announced politely to screen readers, consistent with `docs/accessibility-plan.md`.
- Image slot: `public/personas/<id>.webp` when present, the SVG portrait otherwise.
- Optional later: extra expressions per persona.
