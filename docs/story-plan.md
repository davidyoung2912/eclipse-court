# Story mode: a lore-driven campaign with persistent characters

**Status: S1 to S6 done.** Each phase ends with a commit and a stop (see CLAUDE.md). Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build`; no browser testing.

The setting, factions and ending are in `docs/lore.md`. Story mode tells that story across both courts, with a small cast of named characters who carry from chapter to chapter, so that wins and losses cost something the player can feel.

## Decisions
- **Separate from the 75-battle Campaign.** Story is its own menu card and its own saved state (`eclipse-court:story`), so the Campaign's stars, unlocks and balance are untouched. Story chapters may *reuse* campaign and scenario builders for their fights, but never write to campaign progress.
- **Neither court is the hero.** Acts alternate sides: the player plays Solari, then Umbral, then chooses. The same events are shown from both seats.
- **Four endings** (Solarch keeps the Hour, Duskmother keeps the Hour, shared, free the Queen), chosen at the end of Act III.
- **Mythic tone**: short, concrete lines; every character believes they are protecting something.
- **Light carry-over, not stat growth.** Characters are named pieces with a small trait and a state (ready, wounded, fallen). Nothing changes the hand-tuned balance of the engine or the AI.
- **Data-driven.** Chapters, beats and characters are plain data in `src/engine/data/story/`, validated by tests; the UI only reads them.
- Story progress is a plain list of read chapters (S1), later extended with character states and choices. It is held in memory as well as `localStorage`, like the tip cards, so a device without storage still works for the visit.

## Phases
- **S1 (done): story format and reader.** Types (`Character`, `Beat`, `Chapter`), the cast, the Prologue ("The Stilling", a mythic retelling of the lore's backstory), a chapter list screen reached from a Story card on the main menu, a dialogue reader (tap or key to advance, back, skip, progress), chapters unlocking in order, saved read state, a tip card, and tests for data validity and the read-state store. The engine is untouched and no battle is attached yet.
- **S2 (done): battles in chapters and characters in play.** A `battle` beat that launches a match built from the existing campaign or scenario builders, then returns to the story with the result. Named characters are bound to specific pieces in a chapter's fight; the cast screen shows each one's state (ready, wounded, fallen) and a small trait. Win, lose and lost-character outcomes are saved and picked up by later dialogue. Lose-and-retry never soft-locks.
- **S3 (done): Act I vertical slice (Solari).** About five chapters with three or four recurring characters (Wren, Tam, Voss and the scout), ending with Tam's death. Playtest whether anyone cares before writing more.
- **S4 (done): Act II (Umbral).** The same war from the Vesper Halls, with Tam serving as a Gloom Ghoul; Ilse and the Duskmother.
- **S5 (done): Act III and the four endings.** The player chooses who keeps the Hour; the Eclipse Queen is the last battle (reusing her boss rules); each ending has its own epilogue.
- **S6 (done): polish.** Bond and support conversations between battles, a chapter replay gallery, achievements, and a light rename pass if names change.

## S1 file map
- `src/engine/data/story/types.ts`: `CharacterId`, `Character`, `Beat` (`narrate` or `say`), `Chapter`.
- `src/engine/data/story/characters.ts`: the cast, each with a portrait taken from the existing piece art.
- `src/engine/data/story/chapters.ts`: the chapters (S1 has the Prologue only).
- `src/engine/data/story/index.ts` re-exports; `story.test.ts` checks the data.
- `src/story.ts` (+ test): read-state store, unlocking and the menu summary line.
- `src/ui/menus/Story.tsx` (chapter list) and `src/ui/story/StoryReader.tsx` (dialogue).
- Wiring in `App.tsx`, `MainMenu.tsx`, `menuModel.ts`, `tipData.ts` and `index.css`.

## S2 file map
- `Chapter.battle` (`StoryBattle` in `types.ts`): a scenario id, `bind` (character to piece id), optional `mortal`, and `won` / `lost` scenes. The player is Solari, as in scenarios.
- Beats may carry `when` (`{character, state}` or `{lostBefore: chapterId}`), so later lines answer earlier results.
- `battle.ts`: `storyBattleGame` (wounded start one HP short, fallen are absent), `afterVictory` (taken piece wounds, or kills a `mortal` character; survivors become ready).
- `src/story.ts`: state is now `{read, characters, losses}` (the old array of read ids still loads); `recordStoryWin`, `recordStoryLoss`, `visibleBeats`, `metCharacters`.
- `App.tsx`: chapter beats, then the game (`story` field, not resumable, no campaign stats), then an `aftermath` scene. Quitting mid-fight changes nothing. A loss never changes states, so retrying cannot soft-lock.
- `Story.tsx`: a Company list with each met character's trait and state. Traits are flavour only.

## S3 file map
- `StoryBattle.doomed`: characters who fall in a win however the fight went (`afterVictory` in `battle.ts`), for a death the chapter is written around.
- Act I in `chapters.ts`: `meridian-road` (long-road; Wren, Voss; Tam introduced), `night-watch` (long-night; Tam; Sable named), `sunless-hill` (all three; the shade is burnt), `ruined-gate` (Wren, Voss; the exiled night-touched), `darkening-sky` (all three; Tam `doomed`, the sunwells flare on the shade he stands in).
- Tam is night-touched, the sunwells burn the shade, and the player's win lights them. Sable appears only in dialogue until Act II. Tests check Act I length, Tam's doom, and that conditions point at real characters and chapters.

## S4 file map
- `StoryBattle.court` (`'umbral'`) makes the player Umbral; `scenario` then names a fight in `umbralFights.ts` (Leader Capture, player's army larger than the Solari AI's, built with `campaignGame` and `lineup`). The engine's scenario objectives stay Solari-only, so Act II fights are plain matches.
- `StoryBattle.raised`: fallen characters who stand again in that fight (`withRaised` in `battle.ts`). Tam is raised in `vesper-gate` as a Gloom Ghoul and is an ordinary bound character in the chapters after it. A fallen character in a chapter that does not raise them is simply absent.
- Act II in `chapters.ts`: `vesper-gate`, `crypt-stair`, `troll-debt`, `night-crossing`, `long-dusk` (Tam, Mother Ilse, Sable bound; the Duskmother added to the cast). The act ends with Wren finding Tam; whether he remembers is only hinted (his hands, the bell, the helm). A real choice is left for S5.
- The Company list still shows Tam with the Solari footsoldier portrait.

## S5 file map
- `Chapter.ending` (`EndingChoice`, `EndingOption` in `types.ts`): the choice offered after a chapter's battle is won, with one epilogue (`beats`) per ending. `shared` has `requires: 'clean'`, open only if the final battle was never lost (`cleanVictory` in `story.ts`).
- `scenarioOf` now falls back to `CAMPAIGN` for Solari battles, so Act III reuses `troll-court`, `iron-court` and the `eclipse-queen` boss rules. The player is Solari; Wren, Tam (back among the Solari by choice) and Voss are bound, Ilse and Sable only speak.
- Act III in `chapters.ts`: `sunwell-ledger` (Voss reads the council's secret), `iron-oath` (the courts march on the Sanctum), `the-sanctum` (Ysmere; the Eclipse Queen fight, then the choice).
- `StoryState.ending` is saved; `recordEnding` lets the player choose again. App screens `ending` (`ui/story/StoryEnding.tsx`) and `epilogue`; the Story list shows a button for the choice once the final chapter is read.

## S6 file map
- `bonds.ts` (`Bond` in `types.ts`): five two-person scenes (`wren-tam`, `wren-voss`, `ilse-sable`, `tam-ilse`, `tam-voss`), each open once its `after` chapter is read. Read state is stored in the same set as `bond:<id>`.
- `src/story.ts`: `availableBonds`, `markBondRead`, `bondRead`, `replayableChapters`, `replayBeats` (chapter beats, victory scene, chosen epilogue; changes nothing) and `achievements` (eight, derived from saved state, nothing new stored).
- `Story.tsx` gains Bonds, Gallery and Achievements sections; `App.tsx` gains `bond` and `gallery` screens.
- No rename pass was needed.
