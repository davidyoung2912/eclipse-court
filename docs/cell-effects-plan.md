# Cell effects

Disgaea-style special cells: Might (x1.25 dealt), Ward (x0.8 taken), Recovery (+20% max HP), Hazard (-20% max HP, can kill), Silence (a Leader here cannot cast) and Invincibility (no duel damage on odd rounds). They affect the piece standing on the cell, never one passing over it, and heal/hazard apply at the end of the round.

- **E1** engine: `src/engine/rules/cells.ts`, `MatchConfig.cells`, duels, odds, end of round, casting, share codes.
- **E2** boards: Shrine, Crossroads and Sanctum (mirror-symmetric, unlocked by stars).
- **E3** AI: `cellScore` in `src/ai/strategy.ts`.
- **E4** UI: board glyphs and tooltips, legend, piece card row, attack odds lines.
- **E5** campaign: a scenario sets its own cells with `rules: { cells: cells('hazard', [x, y], ...) }` (replacing the board's, need not be symmetric). Four showcases in `scenariosCells.ts`: Might Ridge (Beginner), Ember Causeway and Warded Hill (Normal), Silenced Gate (Expert).
