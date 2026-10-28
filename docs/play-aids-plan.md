# Play aids: phased plan

Status: **phases 1-9 done.** Written 2026-10-28. Nine ideas from the play-aids discussion, one phase each.

## Ground rules

- Every aid is a toggle under Settings, Play aids, **off by default**, with an icon, like the existing Danger view and AI reasons.
- Fairness: aids that give advice (3 blunder check, 4 odds preview, 6 reminders, 7 hints) are hidden in scored games (daily, weekly, ladder, puzzles that set their own hints) and under fog, the same way Undo and Danger view already are. Information aids that only show the public board state (1 light forecast, 5 eclipse chip, 7-trail) may stay on.
- Engine rules never change. Aids read `GameState`; no aid alters a result.
- Settings stay in `src/settings.ts` (parsed safely, tested in `settings.test.ts`); text goes through `t()` in `src/i18n/en.ts`.
- Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase; stop after each.

## Already in the game (so two of the nine are smaller)

- **Hint** button in the game (`useHint`, `src/ai/hint.ts`, `HintCard`): the AI's best action, with the move looped as a ghost on the board. Phase 7 only adds limits and a setting.
- **Undo** button: present offline, hidden in the daily and scored games. Phase 8 only adds a setting.
- **AttackConfirm** already shows win odds, light and plain advice. Phase 5 extends it rather than adding it.
- **Danger view** (`aids`) and **AI reasons** (`aiWhy`) are the model for the toggles.

## Phases

### Phase 1: Last move trail (idea 7)
- `lastMove` setting and a toggle with icon. `lastMoveOf(history)` in `src/ui/board/aids.ts` (pure, tested): the from and to squares of the latest move.
- The board tints both squares with a soft outline, the destination stronger. Off under fog; not drawn during the replay of a live duel.

### Phase 2: Light forecast (idea 1)
- `forecast` setting. Tint or pip each square by its brightness next round (the dial already forecasts the centre ring only). Show whether it turns toward Solari or Umbral. Uses `ringLuminance(phase + dir, ...)`, respecting events, Eclipse and fixed home squares.
- Selected piece: show the odds shift for its attack squares next round.

### Phase 3: Eclipse countdown chip (idea 5)
- `eclipseChip` setting. A chip near the dial: "Eclipse in N rounds", turning violet one round before, hidden once it falls. Derived from `eclipseRound - round`; accessible text through the polite status line.

### Phase 4: Blunder check (idea 3)
- `blunderCheck` setting. Before a move is applied, a confirm when the destination square is attackable by the enemy on bad odds, or the move leaves your Leader exposed. Reuse `threatenedIds` and `estimateOdds`. A "Move anyway" button and a "don't ask again this match" tick.
- Hidden for scored games and fog.

### Phase 5: Duel odds preview (idea 4)
- `oddsDetail` setting. Extend `AttackConfirm` with a breakdown: light, wounds, cell effects, passives and spells in play, and the odds if the light changes next round. Keep the current compact view when off.

### Phase 6: Beacon and spell reminders (idea 6)
- `reminders` setting. Highlight Beacons any of your pieces could take this turn; a slim line listing castable spells and what each could hit, with a nudge when a spell has gone unused for a few rounds.

### Phase 7: Hint settings (idea 2)
- `hints` setting: Unlimited (today), Three per match, or Off. A per-match counter on the Hint button. Optionally "always show the best move arrow". Scored games keep hints off as now.

### Phase 8: Take-back setting (idea 8)
- `takeBacks` setting: Always (today), Casual games only, or Off. Wire into the Undo button's condition in `Game.tsx`; the daily and scored rules stay unchanged.

### Phase 9: Duel assists (idea 9)
- `duelAssist` setting. Done: a dotted aim line across the arena and bigger hit markers (ring and larger damage text) for the player's fighter, and the last five seconds play at 70% pace for both fighters. Off in scored, daily, puzzle and online games; the AI and the engine are untouched.

## Order and effort

1, 3, 8 and 2 are small. 4, 5, 6 and 7 are medium. 9 needs a read of the duel view first and may shrink or grow.
