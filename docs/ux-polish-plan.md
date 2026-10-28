# UX polish plan: professional finish, more fun

Goal: keep the game's identity (gold against violet, stained glass, the Hour) and make it feel finished: one visual hierarchy, a fitting type pair, motion between screens, a board and pieces with material, ceremony on results, and the Eclipse felt across the whole UI.

Verification per phase: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing). One commit per phase; stop after each so the context can be cleared.

## A. Foundations

1. **Calm the chrome** – glow only where it means something: the one primary action per screen and the active turn. Secondary buttons, cards, spells and choices get a plain border and a quiet gradient, no halo and no pulse. Add shared design tokens (`--surface-1/2/3`, `--shadow-1/2/3`, `--radius-*`, `--tone` per screen) and fold the six pasted checkerboard backgrounds into one rule. Raise the smallest text to a floor of about 0.8rem, and add `:focus-visible` rings and consistent press states.
2. **Typography pair** – a display serif (Cinzel, Cormorant or Marcellus via `@fontsource`) for the title, H1s, piece names, banners and result headings; Nunito stays for UI text. Set body text in Nunito too instead of the system font. Preload the fonts the same way `main.tsx` waits for Nunito.
3. **Screen transitions and motion language** – a short cross-fade with a small slide (180–250 ms) between screens, an iris or shutter wipe into a match and into results, all off under reduced motion. Define one easing curve and three durations (`--ease`, `--t-fast/mid/slow`) and move the hand-tuned animations onto them.

## B. The board and pieces

4. **Board materials** – subtle stone grain and inner shadows on squares, bevelled edges, a gilded frame, and an ambient light wash that follows the current Hour. Board effect cosmetics keep working on top of it.
5. **Piece presence** – a soft ground shadow, a lift on select, a settle on landing, and a capture that shatters the stained-glass panes (they are already separate shapes) in place of the current ring and particles.

## C. Ceremony

6. **Result screens** – a banner that unrolls, stats that count up, rewards that fly to their counters, and distinct victory, defeat and draw treatments.
7. **The Eclipse as an event** – when the Eclipse falls the whole UI desaturates and vignettes and the corona darkens; the HUD tints as the Eclipse round approaches. Driven by the same state as `musicLevel`.

## D. Reach and feel

8. **Desktop menus** – two-column menus (hero art beside the card grid) above 900 px, on the same breakpoint as the board's wide layout.
9. **Haptics and sound polish** – short haptic ticks for select, move and capture outside the duel; a one-time "Sound on?" prompt on first launch (sound defaults to off); a small shared effect vocabulary (confirm, deny, reward, danger).

## E. Content and teaching

10. **Character portraits** – stained-glass portraits for the named figures (Solarch, Eclipse Queen, Aurel, Nocte, bosses) in story scenes and opponent cards.
11. **Collection showcase** – a preview stage for cosmetics that animates the piece set, board effect or capture effect before buying, with rarity frames and an unlock animation.
12. **Onboarding coach-marks** – first-run callouts on the real board ("this ring is a Beacon", the luminance dial, the Eclipse round), shown once and replayable from Settings.

## Status

Phase 1 done: glow is kept for the primary action and switched-on states (secondary buttons, cards and choices sit on shared soft shadows), design tokens (`--shadow-*`, `--surface-*`, `--radius-*`, `--edge`) are in `:root`, the per-section checkerboard backdrops are one rule toned by `--tone-a`/`--tone-b`, the smallest text is raised to 0.75–0.8rem (the piece card strip is resized to match), and `:focus-visible` shows a cream ring.

Phase 2 done: Cinzel (600/700 via `@fontsource/cinzel`) is the display face behind `--display` (title, H1/H2s, banners, result headings, modals); Nunito is now the body face via `--body`, and `main.tsx` waits for both before first render.

Phase 3 done: motion tokens `--ease` and `--t-fast/mid/slow` (140/240/420 ms) are in `:root` and the button, piece, pane, modal, tip and story transitions use them; every screen (`main.app`, except the main menu's own intro) fades in with a small rise, a match opens with an iris, and the combat result opens with an iris from the centre. Both the Settings toggle and the OS reduced-motion query switch these off.

Phase 4 done: board squares get a soft bevel (`.sq-bevel`), a fine stone grain sits over the grid, a gilded frame (`.board-frame`) surrounds it, and an `.hour-wash` light layer tints the board warm as the day rises, violet as it wanes and dark in the Eclipse. Board effect cosmetics still run on the squares and glows underneath.

Phase 5 done: every piece has a soft ground shadow (`.ground-shadow`), lifts and scales on select with the shadow shrinking (`.piece-lift`), and settles with a small squash after sliding to a new square (`.piece-settle`, restarted per landing). A capture now shatters the piece's own stained-glass panes outward (`.shard`), with the equipped capture effect setting shard colour outline, scatter distance and, for the richer effects, the spark lines. Reduced motion switches it all off.
