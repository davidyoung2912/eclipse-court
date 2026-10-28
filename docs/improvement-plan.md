# Improvement plan: playability and longevity

Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase.

1. **Save export / import** – Settings can download every `eclipse-court:*` localStorage key as a file and restore it.
2. **Settings expansion** – separate music / effects volume, large-UI option, colourblind-safe pane palette, keyboard play on the board.
3. **Take-backs vs the AI** – undo the last move pair in skirmish and practice-free modes (not ranked, daily, weekly, online).
4. **Post-loss review + retry** – after a loss, show the biggest blunder and offer "play on from here" against the AI.
5. **Shareable results + daily variety** – Wordle-style result strings for daily/weekly; daily match rotates court by day.
6. **Puzzle code import + puzzle rush** – import a puzzle by code (checked solvable); timed rush over solved-tier puzzles.
7. **Ladder seasons** – season counter, season-best, reset on demand with a soft rating drop, promotion marker.
8. **Skirmish bounties** – optional per-game bounties that pay Shards.
9. **Rivals** – head-to-head record against each ladder foe, shown on the ladder.
10. **Online quick-chat + draw offer** – two new protocol messages.
11. **Personal records** – best ladder peak, fastest win, best streaks on the Stats screen.
