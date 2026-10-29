# The Court Remembers: a Nemesis-style system for the AI personas

Status: **planned, implementation deferred.** Written 2026-10-28 from a read-only survey of the code. Nothing here is built. The open questions were answered on 2026-10-28 (see "Decisions" at the end). Related: `docs/personas.md` (the cast), `docs/personas-plan.md` (how the cast was built), `docs/lore.md`, `docs/accessibility-plan.md`.

## Goal

Make each of the eight personas feel like a rival who has a history with *this* player. Today the court knows only how many games you won and lost against each persona. In Middle-earth: Shadow of War the Nemesis System turns combat outcomes into story: enemies remember how you beat them, are scarred by it, rise when they beat you, come back changed, fall in with allies, and betray. We borrow the same loop, shaped for a two-court board game with a fixed cast of eight and a hand-written voice for each.

The test of success is that a player can say, unprompted, "Cassia still hates my Golems" or "I have to beat Quill before he reaches Seat 1".

## What the Nemesis System does, and what we take from it

| Shadow of War idea | Why it works | Eclipse Court version | Phase |
|---|---|---|---|
| Enemies remember *how* you fought them | A specific callback is worth more than a counter | Memory ledger and recall lines | N1-N2 |
| Titles and scars from how they were hurt | The enemy visibly changes | Epithets, scars, face marks | N3-N4 |
| Enemies adapt to you | The same fight is never the same twice | Scars and trophies nudge the AI's weights | N4 |
| Cheating death | Defeat is not an ending | Fates, returns, immunities | N5 |
| Shame | A choice with a downside | Shame and fury | N5 |
| A grunt who kills you is promoted | Failure has a face | Upstarts from the ladder, the Hall of the Fallen | N9 |
| Hierarchy of ranks | You can read the world at a glance | The Roll of the Court (seats 1-8) | N6 |
| One enemy becomes *your* Nemesis | A single focus for the grudge | The Nemesis designation | N6 |
| Dominate and recruit | Enemies become tools | Spare, Humble, Recruit; Retainers with a boon | N7 |
| Betrayal | Trust has a cost | Telegraphed betrayal of a Retainer | N7 |
| Blood brothers and vengeance | Enemies have relationships | Bonds, Avengers, cameo lines | N8 |
| Sieges and fortresses | A large-scale goal | Not adopted; the arcs and Persona Cup already fill this role | - |

The Nemesis System works because outcomes are *specific*, *visible*, *persistent* and *reversible*. Every proposal below is judged against those four words.

## Where the game is now (survey)

- **Memory:** `src/personaRecord.ts` stores wins, draws, losses and the latest result per persona (key `eclipse-court:persona-record`). `variantFor` picks the `meet`, `grudge`, `ahead`, `behind` or base line bank. Nothing is stored about *how* a game went.
- **Grudge and arcs:** `src/personaArcs.ts` keeps arc steps and one grudge flag per persona. Grudge pays 20 Shards; an arc fight pays 15 and the last adds 100 and a capture effect. Both are settled in `finishGame` in `src/App.tsx` (around line 671), after `recordPersonaGame` (around line 655).
- **Voice:** 114 hand-written lines per persona across 23 categories (`src/engine/data/personaLines/`). `src/banter.ts` maps state changes to categories; `speak` cycles a shuffled deck so no line repeats before the bank is used. Lines are plain strings with no templating. Menu lines come from `personaMenu.ts` and are picked by a stable hash of a key.
- **Face:** `PersonaFace` and the HUD `Dial` show a mood (`src/mood.ts`) that settles back to calm after 3.2 s. Portraits are `public/personas/<id>.webp` with an SVG fallback.
- **Ladder:** foes are generic ("Veteran Rusher"); `ladderVoice` lends them a persona's voice only.
- **Persona Cup:** `src/engine/data/tournament.ts`, seven personas and the player. Matches between personas are a seeded coin.
- **Summary:** `src/engine/data/summary.ts` has `won`, `draw`, `lost`, `taken`, `turns`, `swift`, `spellsCast` and little else. It cannot say *which piece* took a Leader.

### Findings that change the plan

1. **`personaStyle` is never called.** It is defined in `src/engine/data/personas.ts` but nothing uses it. The controller carries only a `PersonalityId` (`src/controllers.ts`), `requestAction` and the worker take only that id, and `chooseAction` reads `PERSONALITIES[personality]` directly (`src/ai/strategy.ts` line 275). So Digby's `guard: 0.4` tweak has never had an effect. Every adaptation below needs the AI to accept a full `Personality`, so fixing this is phase N0. It will slightly change Digby's play, which the balance sims must re-check.
2. **`src/ai/profile.ts` is the duel AI's skill profile, not a player-habit model.** Player habits (below) come from `Summary`.
3. **Backups are prefix-based.** `src/backup.ts` saves every `eclipse-court:*` key except a skip list, so a new store needs no backup registration; it needs only a tolerant `parse…` function and a test that a backup round-trips it.
4. **Settling must run once.** `settleAll` runs once per game and its result is kept in `settledGame` so Continue does not pay twice. Nemesis updates must be idempotent in the same way (see "Idempotency" below).
5. **No "which piece took the Leader" data.** A game's `GameRecord` can be replayed (`replay` in `src/engine/log.ts`), so a pure `storyOf(record, human)` can recover everything; no engine change is needed.

## Design principles

1. **Visible, never hidden.** Anything that changes how a persona plays, or what the board looks like, is named in the briefing and on the dossier. No secret difficulty.
2. **Taste, not stats.** Adaptation changes only the AI's *weights* (what it prefers). It never changes a persona's pieces, HP or the board. The only rule changes are the labelled boons of a Retainer (chosen by the player) and the labelled twists of a Return Match.
3. **Bounded and fading.** Every effect has a cap, an age and a healing time. A player is never permanently punished and a persona is never permanently crippled.
4. **Reversible by play.** Every state can be changed by playing: a grudge by a win, a scar by time, a fury by one fight.
5. **Opt-out.** One setting, **Persona memory: Full / Lines only / Off**, plus "Forget this persona" and "Forget everything". Off records nothing.
6. **No pressure.** No timers, no streak penalties, no expiring offers, no loss of Shards the player did not choose to stake. Ignoring a persona costs nothing.
7. **Hand-written voice.** Every spoken line is hand-written. Slots fill in facts (`{piece}`, `{spell}`); no generated prose.
8. **One new thing at a time.** The first fights teach nothing; features unlock from play (see "Pacing").
9. **Local and pure.** All state is local (like the other stores). The rules are pure functions in `src/engine/data/nemesis/` with seeded randomness, so tests and sims can run them.

## Terminology

In the interface the Nemesis is called **your Dark Hour**, from the lore: the Hour is the realm's cycle of light, and a rival who keeps darkening it for you is your Dark Hour. Slaying one is "Hour restored". Code, files and this plan keep the word *nemesis* (`nemesis.ts`, `world.nemesis`, `nemesis.*` string keys), so only the visible text changes.

| Plan word | Shown to the player as |
|---|---|
| Nemesis | Your Dark Hour |
| Nemesis slain | Hour restored |
| Nemesis banner | "{name} is your Dark Hour" |
| Player title for a slain Nemesis | Bane of {name} |
| The Roll | The Roll of the Court |

## The model

One versioned store, key `eclipse-court:nemesis`, parsed tolerantly like `parseArcs` (drop anything malformed, clamp every number, cap every array). Pure logic lives under `src/engine/data/nemesis/`; the store and its subscribe/snapshot pair follow `src/personaArcs.ts`.

```ts
interface World {
  v: 1
  /** Per persona. */
  rivals: Partial<Record<PersonaId, Rival>>
  /** Seat order on the Roll, 0 = Seat 1. Always a permutation of the eight. */
  roll: PersonaId[]
  nemesis: { id: PersonaId; since: number } | null
  /** Personas barred from becoming the Nemesis again for a few games. */
  cooling: Partial<Record<PersonaId, number>>
  habits: Habits
  retainers: Retainer[]
  upstarts: Upstart[]
  hall: HallEntry[]
  dispatches: Dispatch[]
  /** Games played against any persona; the clock every age and cooldown counts in. */
  tick: number
  /** Id of the last record applied, so a settle never runs twice. */
  last: string | null
}

interface Rival {
  memories: Memory[]          // newest first, at most 8
  scars: Scar[]               // at most 3
  trophies: Trophy[]          // at most 2
  fate: Fate | null           // fled / fallen / humbled, with the tick it returns
  mood: 'plain' | 'shamed' | 'furious' | 'avenging'   // applies to the next fight only
  avenging?: PersonaId        // whose fall they answer
  bond: number                // -2..+3 with the player (Spare +1, Humble -1)
  loyalty?: number            // 0..3, only while a Retainer
  met: number                 // counted games, for pacing
}
```

Ages count in `tick` (counted games against any persona), not days, so a player who takes a month off finds the world as they left it.

### Idempotency

`applyEncounter(world, encounter, seed)` returns `{ world, report }`, where `report` is the list of lines and cards to show. It refuses to run twice for one game by comparing a short stable id of the record (`gameId` in `src/mail.ts` is the model) with `world.last`. All randomness comes from `rngNext` in `src/engine/rng.ts`, seeded from the game's seed, the persona id and `met`.

### Which games count

| Counts | Does not count |
|---|---|
| Skirmish, Ladder, Arc and Grudge fights against a persona, on Normal or harder, finished | Hot-seat, online, mail, co-op, puzzles, scenarios, campaign, daily, weekly, ghost, Gauntlet |
| Persona Cup matches (the Roll only, see N6) | Games on Easy: they feed the head-to-head record exactly as now, but write no memory, scar, trophy or Roll move ("easy games teach the court nothing") |
| | Quit games, unless an audit (N0) finds an existing resign path, which then counts as a loss once the game is past ply 6 |

## Features

### 1. The memory ledger (N1, N2)

`storyOf(record, human)` replays the game once, when it settles, and returns a short story. A game yields at most **two** memories, chosen by the salience table; a persona keeps the newest eight. A repeat of the same kind and subject merges and counts ("again").

| Kind | Found when | Slots |
|---|---|---|
| `leader-fell` | The player took the persona's Leader | `{piece}` = the role that did it |
| `leader-took` | The persona took the player's Leader | `{piece}` |
| `fav-piece` | One of the player's roles took 3 or more of their pieces | `{piece}`, `{n}` |
| `fav-spell` | The player cast the same spell 2 or more times | `{spell}` |
| `sweep` | One court held every Beacon at some point | |
| `eclipse` | The game was decided after the Eclipse (won by either side) | |
| `flawless` | A side lost no piece | |
| `comeback` | The winner trailed in `materialLead` (`src/fallen.ts`) by 8 or more at some point | |
| `walkout` | A past-ply-6 resign (only if the audit finds the path) | |
| `draw` | The game was drawn | |

Salience order, highest first: `leader-took`, `leader-fell`, `comeback`, `flawless`, `sweep`, `eclipse`, `fav-piece`, `fav-spell`, `draw`, `walkout`. Ties go to the more recent ply.

**Recall lines.** A new set of hand-written categories (`recall-<kind>`, 4 or more per persona each) is spoken in four places: the main-menu greeting, the pre-fight briefing, the first `open` of a fight, and the post-fight farewell. At most one recall per surface, never the same memory twice in a row, and never in the fight where it was made. Slots are filled by a small `fill(line, slots)` helper. A test fills every line with the *longest* possible slot value and requires the result to fit `LINE_MAX` (90), and rejects unknown slot names and a line that names a slot its category cannot supply.

### 2. Epithets, scars and trophies (N3, N4)

**Epithet** (shown under the name wherever the persona appears, in place of the tag only on the dossier and the versus card; the short `tag` stays elsewhere so nothing overflows). It is the newest scar's title or trophy's title, at most 22 characters, e.g. "Golem-Scarred", "Beacon-Burned", "Dusk-Struck", "the Shamed", "Leader-Taker". Titles come from the tables below; with no scar or trophy yet, the epithet comes from the newest memory.

**Scars** come from how the player beat them. Each is a *named, visible* nudge to one or two AI weights:

| Scar | Earned when the player won by | Effect on the AI (before caps) | Title |
|---|---|---|---|
| Wary of {piece} | Taking the Leader with that role | `fear[role]` up: it weighs a threat from that role more | {piece}-Scarred |
| Dusk-Wary | Winning after the Eclipse | `beacon` +0.2 and `guard` +0.1 before the Eclipse | Dusk-Struck |
| Beacon-Burned | A `sweep` | `beacon` +0.3 | the Dispossessed |
| Spell-Shy | Casting 3 or more spells to win | `screen` +0.2, `guard` +0.1 | the Warded |
| Shamed | A `flawless` win (this also sets `mood = 'shamed'`) | see Shame, below | the Shamed |

**Trophies** come from how the persona beat the player:

| Trophy | Earned when the persona won by | Effect | Title |
|---|---|---|---|
| Took the {piece} | Taking the Leader with that role | `hunt[role]` up: it values trading that role more | {piece}-Hunter |
| Beacon-Taker | A `sweep` | `beacon` +0.2 | Beacon-Taker |
| Night's Own | Winning after the Eclipse | `attack` +0.1 | Eclipse-Born |

**Role-aware weights.** `Personality` (`src/engine/data/personality.ts`) gains two optional maps, `fear` and `hunt`, each `Partial<Record<Role, number>>` multiplying the role's value in the strategy's material term. Defaults are empty, so existing behavior is bit-for-bit unchanged (N0 proves this with a test over seeded positions). N0 reads `src/ai/strategy.ts` to place the terms exactly.

**Caps.** Each scar and trophy moves one weight by at most 0.3 and each role map entry by at most 25 percent. All of a persona's adaptation summed stays within 0.6 per weight. Maximum 3 scars and 2 trophies. A new one pushes the oldest out.

**Healing.** A scar fades after 6 further counted games against that persona; a trophy after 8. Repeating the feat refreshes it instead of stacking.

**Studied habits.** `Habits` keeps three smoothed numbers from `Summary`: *spell reliance* (`spellsCast`), *aggression* (`taken` over `turns`) and *swiftness* (`swift`). Each persona has one `studies` axis in its data (Pym spells, Cassia aggression, Quill swiftness, and so on) and, once the player's habit on that axis crosses a threshold over 5 or more games, gains a visible chip ("Pym has studied your spellcasting") and a small counter-weight (for example `screen` up against a heavy caster). Same caps; only at *Full*.

**Disclosure.** The briefing and versus card list active scars, trophies, shame and fury in plain words with a one-line effect ("Wary of Chargers: guards its Leader harder against them"). The dossier explains every term.

**Face marks.** `PersonaFace` gets an overlay layer drawn over the portrait: a scar line, an eyepatch, a bandage, soot, a chain, and a small crown for Seat 1. Each mark is tied to a scar, trophy or status, placed by a percentage box (N3 audits the eight cropped portraits to find a box that works for all), has an `aria-label`, and does not animate. Marks are cosmetic and never carry meaning alone; the text chips say the same thing.

### 3. Fates, returns and shame (N5)

After a *counted win* the player has not already spent on Spare/Humble/Recruit (see 4), a seeded roll decides the persona's fate:

- `pFallen` = 0.05, plus 0.15 if the game was `flawless`, plus 0.10 if the Leader was taken, capped at 0.30.
- `pFled` = 0.25.
- Otherwise `humbled`: they stay, with a scar (always).
- **Pity:** after 4 humbled results in a row for one persona, the next is `fled`.

| Fate | Effect | Returns | On return |
|---|---|---|---|
| Humbled | They keep their seat; a scar is added | At once | A scar-aware briefing line |
| Fled | Skipped by "random opponent" and by the persona of the day for 2 counted games, still selectable by hand | After 2 | A **Return Match** is offered; an immunity (below); `mood = 'furious'` |
| Fallen | As Fled, for 3 counted games, and the Roll marks them "recovering" | After 3 | Return Match, immunity, and the epithet "the Returned" |

A fallen or fled persona is never locked out: selecting them by hand always works. Arcs, the Cup and grudge matches ignore fates.

**Immunity ("cheating death").** On return, one active scar flips: a *Wary of {piece}* scar becomes *Ward against {piece}* (the persona now weighs that role's threats *less*, for 8 counted games), so the thing that beat them last time is not a sure thing any more. A flipped scar's title becomes a returned title ("Wardbound"). The player sees the reversal on the dossier and in the briefing. Any other scar kind returns as a trophy of the same weight (they learned from it).

**Shame.** A flawless win marks the persona `shamed` for their next fight only: attack +0.3 and guard −0.3 (reckless; easy to bait, dangerous to ignore). Their next fight line comes from `shamed`. It clears after that fight. A shamed result never stacks with fury.

**Fury.** A Return, a Humble choice or a Betrayal marks them `furious` for one fight: attack +0.2, bait +0.2. The briefing says so.

**Return Match.** A skirmish that opens from the main menu's "Next up" card or the dossier, against that persona, with their immunity active and a **labelled twist** drawn from a short list that already exists in the arc definitions (for example "+1 HP on their Chargers", "the day runs backwards"). Pays 35 Shards once per return. Declining costs nothing.

### 4. After a win: Spare, Humble, Recruit (N7)

After a counted win in a plain Skirmish against a persona (not Arc, Grudge, Ladder, Cup), a one-line choice appears in the result dialog. Dismissing it chooses **Spare**.

| Choice | Effect | Cost or risk |
|---|---|---|
| **Spare** | `bond` +1. No fate roll; no scar from this win. They owe you ("Respect" chip) | No Shards bonus; a persona you spare often is easier to recruit |
| **Humble** | `bond` −1. The usual scar, plus Shame if flawless; the fate roll's `pFled` and `pFallen` double | Returns furious. A humbled persona's bonded partner (see 6) becomes an Avenger |
| **Recruit** | Requires `bond` 1 or more and 60 Shards. The persona becomes a **Retainer** | Uses one slot (1 at first; 2 once all eight personas have been met); loyalty 3 |

**Retainers and boons.** A Retainer lends one **boon** to a chosen Skirmish, chosen on the setup screen (a "Retainer" row). A boon may use *only* existing match knobs (the `setup` helpers `hpOf` and `hpAll` in `src/engine/data/campaignHelpers.ts`, `MatchConfig` rules, `shardMultiplier`, the hint system). N7 starts with an audit of those knobs; the list below is the intent, each replaced by the nearest existing knob if it cannot be done without a rule change.

| Persona | Boon | Knob |
|---|---|---|
| Cassia | Dawn Charge: Chargers +1 HP | `hpOf(['charger'], 1)` |
| Pym | Marginal Notes: one extra spell in the loadout | loadout |
| Bea | The Door Holds: Leader +1 HP | `hpOf(['leader'], 1)` |
| Mudge | Interest Paid: Footsoldiers +1 HP | `hpOf(['footsoldier'], 1)` |
| Lowen | Ninth Life: the Eclipse is 2 rounds later | `eclipseRound` |
| Digby | Volunteers: one extra Footsoldier | army (legal-draft check) |
| Quill | Commission: Shards from the win ×1.25 | `shardMultiplier` |
| The Regent | Counsel: one free hint a game | hints |

Boons are balanced by sim to move the win rate by at most 4 points. A game with a boon pays 15 percent fewer Shards and never counts toward the Daily, Weekly, Ladder rating, ghost challenges, bounties or achievements that need a "pure" win (it follows the same exclusions as a ghost game).

**Betrayal.** Loyalty drops by 1 when a game with the Retainer's boon is lost, and by 1 when the player Humbles one of their bonds. At 0 the Retainer is **wavering**; this is shown on the dossier and the setup row, with a foreshadowing line, a whole game before anything happens. If it reaches 0 again, or the Retainer is a Cup finalist against the player, the Retainer **defects** between games, never mid-game: they leave the slot, become `furious`, gain the epithet "the Turncoat", and a **Betrayal Match** (40 Shards, once) is offered. Quill's `defect` line can acknowledge that he is not sure who pays him; no line may state another persona's secret.

**Fight beside a Retainer (in scope, N7).** In Co-op scenarios the second seat may be filled by a Retainer, played by the AI in their style (the co-op alternation already exists in `src/engine/data/coop.ts`). Counted as co-op; no memory.

### 5. The Nemesis and the Roll (N6)

**Nemesis designation.** Looking at the last 8 counted games against each persona, `score = 3 × losses − 2 × wins + trophies − scars`. When the highest score is 3 or more *and* the persona has beaten the player at least twice, they become **your Nemesis**:

- A banner on the main menu's "Next up" card and a crest on their dossier.
- A **versus card** before every fight with them: portrait, epithet, active scars and trophies, a recall line.
- A `nemesis` line when declared.
- Beating them **slays** the designation: 60 Shards once per designation, the line `nemesis-slain`, a player title ("Bane of {name}") for the Stats page and share card, and a 5-game cooldown before that persona can be named again.
- The Nemesis is replaced only when another persona's score exceeds it by 2 or more, so it does not flicker.
- If nobody qualifies, there is no Nemesis. That is fine.

**The Roll of the Court.** An ordered list of the eight personas, Seat 1 to 8, shown as an `<ol>` on a Roll screen. The starting order is fixed in data (flavour: the Regent first, Digby last). After a counted result: a win over a persona swaps them with the one *below*; a loss swaps them with the one *above*; draws do nothing. At most one swap per game. Persona Cup matches move the Cup winner up one seat once per Cup. The Roll has no bearing on AI strength. It changes two things:

- **Reward:** the first win over a persona each day pays +25 percent Shards if they sit in Seats 1-2 and +10 percent in Seats 3-4. The extra is capped at 15 Shards a day.
- **Recognition:** Seat 1 is "the Hour-Warden", with a crown mark, and gets its own versus-card flourish.

### 6. Bonds, Avengers and cameos (N8)

A small table (authored in data, flavour from `docs/personas.md`; no bond may reveal a secret):

| Bond (allies) | Why |
|---|---|
| Bea and Mudge | Both hold a line |
| Cassia and Digby | The loud ones; she cheers him on |
| Pym and The Regent | Records and the old claimants |
| Lowen and Quill | Debts and favours |

| Rivalry | Why |
|---|---|
| Cassia and Mudge | Haste against patience |
| Bea and Lowen | A guard against a gambler |
| Pym and Quill | A scholar against a clerk |

- **Avenger.** When the player takes the Leader of one persona (a counted win), each of their bonded partners becomes `avenging` for their next meeting (expires after 3 counted games). The briefing names the fallen ally, a line from the `avenge` category is spoken, and attack +0.2 for that fight.
- **Gloat.** When a persona is beaten, their rival may speak a `gloat` line at the next greeting; the bonded partner a `mourn` line.
- **Cameo.** In an Avenger fight, a second small portrait (the bonded persona) sits beside the first for the briefing and speaks 2-3 lines at the start, the Eclipse and the end. No extra pieces.
- Bonds also seed the Persona Cup bracket so allies meet late.

### 7. Upstarts and the Hall of the Fallen (N9)

Ladder foes ("Veteran Rusher") are anonymous. When the player loses a ladder game on Normal or harder, the foe may be **promoted**: 100 percent the first time, 50 percent afterwards, at most 3 Upstarts at once. An Upstart has a seeded name, a seeded look and the play style of the foe, and takes over that foe's ladder slot with a banner, so ladder ratings are unchanged. They keep their own record against the player.

- **Names:** drawn from first-name and by-name tables (about 48 and 24 entries), never repeating among the living or the Hall.
- **Look:** the SVG portrait generator (`src/art/portraits.ts`) with a seeded variation; N9 audits whether it already takes a seed.
- **Voice:** a bank per play style (7 styles × 6 categories × 4 lines) with `{name}` and recall slots. Each Upstart also uses the ledger and scars.
- **End:** beating an Upstart twice puts them down; they go to the **Hall of the Fallen** (a list of up to 50: name, epithet, final record, and the move that ended them), where the player can read them. An Upstart who beats the player 3 times is **inducted**: they get a permanent dossier entry and Seat 9, below Digby. This is the one case where the Roll grows (and is capped at 11 inductees).

### 8. Dispatches and wagers (N10)

Personas reach out on the main menu. A **Dispatch** is a card, not a notification, and never expires.

| Kind | Trigger | Content |
|---|---|---|
| Taunt | A 3-loss run against one persona | A line and a Grudge Match button |
| Tribute | A 3-win run | A respectful line; a Spare reminder |
| News | A Roll change, a return, an induction, or a Cup result | One line of court gossip |
| Challenge | A persona wants a rematch with a stated twist | A Return-style match; pays nothing extra |
| Wager | A rival (Lowen's offer first; Quill's invoice as a variant) | The player picks a stake of 10, 20 or 30 Shards (never more than the balance); winning pays the stake back plus an equal amount, losing forfeits the stake. Once a day; only offered when the balance covers it |

Rules: at most one new Dispatch per launch; the list keeps the last 20; Banter off or Persona memory off stops them entirely; a wager is always an explicit, labelled choice with no default selected.

**Persona of the week.** The Weekly (`src/engine/data/weekly.ts`) names a host persona from the week's seed. The host gives a themed line set, and a win in the Weekly *that week* counts as a normal Roll move for the host (the only Weekly effect on the Roll).

### 9. Everything else that makes this work

- **Player titles.** Slaying a Nemesis, completing the Roll (every persona beaten twice), recruiting a Retainer and putting down an Upstart each award a title shown on Stats and the share card (`src/shareCard.ts`).
- **Share a rivalry.** The share card gains a "My Nemesis" variant: portrait, epithet, record.
- **Replay the moment.** Every `leader-fell`, `leader-took` and `comeback` memory keeps the game's record code (the Ghost store keeps up to 6000 characters; a longer game keeps none), and every Hall entry keeps the game that ended it, so the dossier and the Hall can offer *Watch the moment* through the existing Replay screen. These codes are the first thing the storage budget trims (see "Storage budget").
- **Achievements.** A short list added to the existing achievements: *Nemesis Slain*, *Mercy*, *Turncoat*, *Full Court* (all eight Roll seats have changed hands), *Hall Monitor* (10 in the Hall).
- **Cosmetics.** One capture effect per persona is already an arc prize; add an unlockable epithet badge for the player's profile. No new currency.
- **Tips.** `src/tips.ts` gains a few tips that explain the Roll, scars and Spare, shown only once the feature has unlocked.

## Pacing and onboarding

The first counted game against a persona writes a memory but shows nothing new. Unlocks:

| Unlock | After |
|---|---|
| Recall lines | 1 counted game against that persona |
| Dossier and epithets | 2 counted games against any persona |
| Scars, trophies, studied habits | 2 counted games against that persona |
| Fates, Returns, Shame | their first scar |
| The Roll and the Nemesis | 6 counted games in total |
| Spare, Humble, Recruit | 10 counted wins in total |
| Bonds and Avengers | the Roll unlocked and 2 personas beaten |
| Upstarts | 5 ladder games |
| Dispatches | 12 counted games in total |

A single one-time card, **The court remembers**, explains the system the first time a recall line plays: what is remembered, where to see it (Rivals), and how to turn it off. The "Next up" card (`nextUpSlot` in `src/ui/menus/menuModel.ts`) gets a rival slot with a fixed priority: Return Match, then Nemesis, then Dispatch, then Grudge. Only one shows at a time.

## Settings and privacy

- **Persona memory** (in `src/settings.ts`): *Full* (default), *Lines only* (ledger, dossier and recall lines, no adaptation, no fates, no Roll effects on rewards), *Off* (nothing is recorded; existing data is kept but unused).
- **Forget** buttons on each dossier and in Settings (the existing `ResetButton`, with the usual confirm).
- Everything stays on the device and in backups (prefix-based, see Findings). Nothing is sent anywhere.
- The Accessibility statement in Settings gains a line about this system.

## Storage budget

Everything is kept in the browser's `localStorage`, as with the other stores, so that backups and the in-memory fallback keep working. Replay codes are the only large items, so the budget is enforced in one place (`commit` in `src/nemesis.ts`).

| Item | Size cap |
|---|---|
| Memories (8 per persona) | text only, under 1 KB per persona |
| Replay codes (`leader-fell`, `leader-took`, `comeback`, Hall) | 6000 characters each, up to 3 per persona and 50 in the Hall, so at most about 400 KB |
| Everything else (rivals, roll, habits, retainers, upstarts, dispatches) | under 100 KB |
| **Whole world** | **600 KB** |

When a commit would exceed the budget, replay codes are dropped oldest first, then the oldest dispatches. Text is never dropped. If `setItem` throws (quota or a private window), the world stays in memory for the visit, exactly as `personaArcs.ts` does, and Settings says so once. A test fills the world to its caps, checks the size, and checks that `parseWorld` still reads it.

## Accessibility

- All new text goes through `src/i18n/en.ts` (`nemesis.*`), except line banks, which live in data like the existing ones.
- Recall and fate messages use a polite live region, as banter does. Versus cards and dispatches are focusable dialogs with `useDialog`; Escape closes them; no timers.
- The Roll is an `<ol>`; chips are text; face marks have labels; nothing relies on colour alone (`marks` setting and `scripts/contrast.ts` cover the new tokens, and the contrast test is extended).
- *No turn clocks* and *Reduce motion* are respected: no new animation runs under either.
- Persona memory *Off* leaves the game exactly as it plays today.

## Economy

All numbers are placeholders to tune in N6 against `shop.ts` incomes.

| Source | Shards | Limit |
|---|---|---|
| Return Match win | 35 | Once per return |
| Nemesis slain | 60 | Once per designation |
| Betrayal Match win | 40 | Once per betrayal |
| Roll bonus | up to 25 percent of a win | 15 a day |
| Grudge, arc fights | unchanged (20, 15, 100) | |
| Recruit fee | −60 | Needs `bond` 1 or more |
| Wager | ± stake of 10, 20 or 30 | Once a day, balance must cover it |

New income per day is capped at 120 Shards.

## Authoring budget (the largest cost)

The line banks are the bulk of the work. Today: 114 lines × 8 personas. New banks are **separate files** (`personaLines/nemesis/<id>.ts`, a `NemesisLines` type with its own category list and its own minimums), so the existing `PersonaLines` record and its tests do not change and phases land one at a time.

| Bank | Categories | Lines each | × 8 personas |
|---|---|---|---|
| Recall (N2) | 10 (`recall-<kind>`) | 4 | 320 |
| Fate and shame (N5) | `fled`, `fallen`, `return`, `shamed`, `fury` | 4 | 160 |
| Choices (N7) | `spare`, `humble`, `recruit`, `wavering`, `defect` | 4 | 160 |
| Nemesis (N6) | `nemesis`, `nemesis-slain` | 4 | 64 |
| Bonds (N8) | `avenge`, `gloat`, `mourn` | 4 | 96 |
| Dispatches (N10) | `taunt`, `tribute`, `wager-offer`, `wager-win`, `wager-lose` | 3 | 120 |
| Upstarts (N9) | 6 per play style | 4 | 7 styles → 168 |

That is about 1,090 lines in total, and more wherever a category turns out to need variety. The shared tests apply the existing rules (90 characters, no repeats in a bank, no empty lines, never name another persona's secret, never tell the player what to do except the Regent) plus the slot checks. Phases that need lines land with them, in two batches (four personas, then four) as phases 2-3 of the personas plan did, so a phase can be reviewed in a sitting.

## Testing and balance

- **Per phase:** `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build` (no browser testing, per `CLAUDE.md`).
- **Pure rules** get unit tests with fixed seeds: `storyOf` on hand-built records, salience and merge, scar earning and healing, the fate roll (including pity), the Nemesis score and cooldown, the Roll swap, the Avenger window, Upstart promotion and the cap, wager bounds, `parseWorld` on junk input, and idempotency (the same record twice changes nothing).
- **Store tests:** a backup export and import round-trips the world; a world from a future version is dropped, not crashed on; a device without storage still works in memory.
- **AI behavior:** a test that an empty adaptation gives exactly the old choices on 30 seeded positions (N0), and that every scar, trophy, shame and fury stays within its caps.
- **Balance sims** in `src/sim` and `scripts/run-sim.mjs`: a persona with the most extreme legal adaptation against the same persona with none, at Normal and Hard, over a fixed number of seeded games. The adapted persona's win rate must stay within 8 points of the baseline, and each boon within 4. A small version of this runs in the test suite (few games); the full sweep is a script.
- **Line tests:** the slot check with the longest slot values, and a coverage test that every memory kind and every fate has a bank.
- **Manual checklist** (no browser automation): each phase's UI is reviewed by the user on a phone-width and a desktop window, in Light/Dark and with Reduce motion.

## Risks

| Risk | Mitigation |
|---|---|
| Difficulty creep from stacked effects | Hard caps, healing, a sim guard, *Lines only* mode, and every effect shown in the briefing |
| Too much text; the system feels like homework | Pacing table; one new thing at a time; every card is skippable |
| Callbacks feel wrong when facts are wrong | Slots come only from `storyOf`; salience prefers rare facts; tests for each kind on hand-built records |
| Players farm Shards from the new events | Every payout is once-per-event; Easy games write nothing; the daily cap |
| Saves bloat | Caps on every array and a 600 KB storage budget that trims the oldest replay codes first (see "Storage budget") |
| Engine or AI regressions | N0 changes nothing observable and proves it; the Digby tweak fix is the one intended change |
| Authoring cost | Separate banks, landed in batches, with minimums per category |
| Confusion with the existing Grudge and Arcs | The Grudge stays as is and feeds the Nemesis score; the dossier shows Arc progress beside it |

## Phases

One commit per phase, then stop, as `CLAUDE.md` requires. N0-N6 are the core loop and worth shipping on their own; N7 onward are expansions.

### N0: Foundations (no visible change)
- Plumb a `Personality` through the controller, `useAiTurn`, `ai/client.ts`, the worker and `chooseAction`; `personaStyle` finally applies. Test that a plain `PersonalityId` plays exactly as before.
- Add optional `fear` and `hunt` role maps to `Personality` and read them in `strategy.ts`. Test that empty maps give identical choices on 30 seeded positions.
- Audit and record in this file: resign and quit paths; whether `portraits.ts` takes a seed; the `MatchConfig` knobs available for boons; the eight portraits' crop for face-mark placement; the court-aware piece names in `pieceInfo`; the achievements list shape.
- Add the *Persona memory* setting (with the three values, stored, tested) and the `nemesis.*` i18n scaffold.
- A sim script comparing a persona with and without adaptation.
- Done when: all four checks pass, Digby's play change is noted, and the audit answers are written below.

### N1: The ledger
- `src/engine/data/nemesis/` with `types`, `story` (`storyOf`), `memories` (salience, merge, cap), `apply` (`applyEncounter`, idempotent) and `parseWorld`.
- `src/nemesis.ts`, the store (snapshot, subscribe, commit, in-memory fallback).
- Hook `applyEncounter` into `finishGame` after `recordPersonaGame`, for counted games only, honoring the setting.
- Settings: "Forget everything". No other UI.
- Tests as listed above.

### N2: Recall lines
- `personaLines/nemesis/` types, the first bank (recall), `fill` and the slot tests.
- Authoring batch A (Cassia, Pym, Bea, Mudge), then batch B (Lowen, Digby, Quill, The Regent).
- Use recall in the greeting, briefing, first `open` and farewell (`personaMenu.ts`, `banter.ts`, `Game.tsx`), with the once-per-surface and not-in-the-same-fight rules.
- The one-time "The court remembers" card.

### N3: Rivals dossier, epithets and marks
- A **Rivals** screen (linked from Goals and the Battle menu, beside Arcs): per persona, portrait, epithet, record, memories in words, arc progress, grudge, and *Forget this persona*.
- Epithet derivation (memory-based until N4 adds scars).
- `PersonaFace` mark overlay layer, with the eight placement boxes from the N0 audit.
- Rivals chips appear in the pre-fight briefing.

### N4: Scars, trophies and studied habits
- `scars.ts` (tables, caps, healing, aging by `tick`), `adapt.ts` (`adaptedStyle(persona, world)` returns a `Personality`), `Habits`.
- Plumb `adaptedStyle` into the controllers at game start (so the style is fixed for the game, and a resumed saved game keeps it by storing it in the saved fight).
- Disclosure in the briefing and dossier. Marks for scars and trophies.
- Balance sims and caps tests. Full-versus-Lines-only behavior test.

### N5: Fates, returns, shame and fury
- `fates.ts` (the roll, pity, immunity flip), shame and fury moods, the Return Match (twist list reuses arc definitions).
- The **versus card** (`src/ui/tray/VersusCard.tsx`) used for Return, Shamed and Furious fights.
- Fate lines (batches A and B). "Next up" rival slot with the priority above.
- "Random opponent" and "persona of the day" skip fled and fallen personas.

### N6: The Nemesis and the Roll
- `roll.ts`, `nemesis.ts` (score, designation, cooldown, slay), the Roll screen, reward bonus and its daily cap, Persona Cup hook.
- Versus card for the Nemesis; `nemesis` and `nemesis-slain` lines.
- Player titles on Stats and the share card ("Bane of {name}"); achievements *Nemesis Slain*, *Full Court*.
- Tune the economy table here.

### N7: Spare, Humble, Recruit; Retainers and betrayal
- The post-win choice in the result dialog; `bond` and `loyalty`.
- `retainers.ts`, the setup row, the boon list (after the knob audit), the 15 percent Shard reduction and exclusions.
- Betrayal: wavering, defect, the Betrayal Match.
- Choice lines (batches A and B).
- A Retainer can fill the second seat in Co-op scenarios, played by the AI in their style.
- Sims for each boon.

### N8: Bonds, Avengers and cameos
- `bonds.ts` (the two small tables), avenging flag and window, the second cameo portrait on the briefing and HUD, `avenge`, `gloat` and `mourn` lines.
- Cup seeding by bonds.

### N9: Upstarts and the Hall
- `upstarts.ts` (name tables, promotion, cap, induction), seeded portraits, the style banks, the ladder alias, the Hall of the Fallen screen.
- Seat 9 and the Roll growth cap.

### N10: Dispatches, wagers and the persona of the week
- `dispatches.ts`, the Dispatch cards, wager flow with its bounds, the Weekly host.
- Dispatch lines.

### N11: Polish and release
- Tips, the Accessibility statement, the README, `docs/personas-plan.md` and `docs/personas.md` updated, the contrast test extended.
- Audio sting for versus cards (`audio/synth.ts`), reduce-motion paths checked.
- Share-card variant, replay-the-moment, remaining achievements.
- A final balance sweep and a save-migration test with a v1 world.

## Decisions (confirmed 2026-10-28)

1. **Persona memory defaults to Full.** *Lines only* and *Off* stay available in Settings.
2. **Name:** "your Dark Hour" in the interface (see Terminology); `nemesis` in code.
3. **Keep everything that is reasonable to store locally.** Retainers (including Co-op), Upstarts and the Hall, Dispatches and wagers, the Roll, bonds, replay codes and player titles are all in scope, within the storage budget above. The wager keeps its guard rails (explicit, no default stake, never above the balance, once a day, in-game Shards only).
4. **Lines:** all of them are written, in batches, as part of the phase that needs them (about 1,090, more where useful). A phase is not finished until its banks pass the shared tests for all eight personas (or all seven styles). Each phase's lines are written in two batches, four personas then four, and the persona voice rules in `docs/personas.md` apply to every line.
5. **Roll start order, bonds and rivalries:** the proposals in this file stand until edited. They are finalised at the start of N6 (the order) and N8 (bonds).

## Audit answers (filled in during N0)

- Resign and quit paths:
- `portraits.ts` seed support:
- `MatchConfig` knobs for boons:
- Portrait crops for face marks:
- Court-aware piece names:
- Achievements list shape:
- Digby sim before and after the style fix:
